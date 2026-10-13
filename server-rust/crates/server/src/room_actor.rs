//! The owner of one room: a task with a bounded mailbox. Rooms run in parallel on every core; inside a room
//! the logic is sequential, and the fan-out only pushes shared bytes into the recipients' outboxes (their
//! writer tasks, on any core, do the rest).

use std::collections::HashMap;
use std::sync::Arc;

use wa_core::geometry::{Position, Viewport};
use wa_core::room::{Clock, Event, JoinRequest, Room, RoomConfig, Sink, UserId};
use wa_core::user::DetailsChange;
use wa_proto::messages as pb;

use crate::metrics::{METRICS, dec_room_gauge};
use crate::outbox::Frame;
use crate::registry::ActorRegistry;
use crate::session::Session;
use crate::wire;

pub const MAILBOX: usize = 1024;

pub enum RoomCmd {
    Join {
        session: Arc<Session>,
        request: JoinRequest,
    },
    Move {
        user: UserId,
        position: Position,
        viewport: Option<Viewport>,
    },
    Viewport {
        user: UserId,
        viewport: Viewport,
    },
    Details {
        user: UserId,
        change: DetailsChange,
    },
    /// Where is that player? (askPositionMessage: walk to them, or locate them.)
    AskPosition {
        user: UserId,
        target_uuid: String,
        target_id: Option<UserId>,
        locate: bool,
    },
    /// By session: the room resolves the user itself, so a leave sent right after a join (FIFO) is never lost.
    Leave {
        session: Arc<Session>,
    },
}

pub type RoomHandle = tokio::sync::mpsc::Sender<RoomCmd>;

struct SystemClock;
impl Clock for SystemClock {
    fn now_ms(&self) -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_or(0, |d| d.as_millis() as u64)
    }
}

pub fn get_or_spawn(registry: &Arc<ActorRegistry<RoomCmd>>, url: &str, config: RoomConfig) -> RoomHandle {
    registry.get_or_spawn(url, || {
        let (tx, rx) = tokio::sync::mpsc::channel(MAILBOX);
        let room = Room::new(url, config, Box::new(SystemClock));
        tokio::spawn(run(room, rx, registry.clone()));
        tx
    })
}

/// Encodes each event once, then hands the bytes to every recipient.
struct Fanout<'a> {
    sessions: &'a mut HashMap<UserId, Arc<Session>>,
    joining: Option<Arc<Session>>,
}

impl<'a> Fanout<'a> {
    fn new(sessions: &'a mut HashMap<UserId, Arc<Session>>) -> Self {
        Self { sessions, joining: None }
    }

    fn each(&self, to: &[UserId], frame: &Frame) {
        for id in to {
            if let Some(s) = self.sessions.get(id) {
                s.push(frame.clone());
            }
        }
    }
}

impl Sink for Fanout<'_> {
    fn emit(&mut self, to: &[UserId], event: Event<'_>) {
        use pb::server_to_client_message::Message as Top;
        use pb::sub_message::Message as Sub;
        let frame = match event {
            Event::RoomJoined(user) => {
                if let Some(session) = self.joining.take() {
                    session.set_user_id(user.id);
                    session.push(wire::direct(Top::RoomJoinedMessage(pb::RoomJoinedMessage {
                        current_user_id: user.id,
                        character_textures: wire::textures_to(&user.profile.textures),
                        companion_texture: user.profile.companion.as_ref().map(|c| pb::CompanionTextureMessage {
                            url: c.url.clone(),
                            id: c.id.clone(),
                        }),
                        can_edit: user.profile.can_edit,
                        activated_invite_user: true,
                        ..pb::RoomJoinedMessage::default()
                    })));
                    self.sessions.insert(user.id, session);
                }
                return;
            }
            Event::UserMoved(user) => {
                // Moves coalesce in the outbox: encode once, push as a move.
                let Frame::Sub(bytes) = wire::sub(wire::user_moved(user)) else { return };
                for id in to {
                    if let Some(s) = self.sessions.get(id) {
                        s.push_move(user.id, bytes.clone());
                    }
                }
                return;
            }
            Event::UserJoined(user) => wire::sub(wire::user_joined(user)),
            Event::UserLeft(id) => wire::sub(Sub::UserLeftMessage(pb::UserLeftMessage { user_id: id })),
            Event::GroupUpdated(g) => wire::sub(wire::group_update(g)),
            Event::GroupDeleted(id) => wire::sub(Sub::GroupDeleteMessage(pb::GroupDeleteMessage { group_id: id })),
            Event::GroupUsersUpdated(g) => wire::sub(Sub::GroupUsersUpdateMessage(pb::GroupUsersUpdateMessage {
                group_id: g.id,
                user_ids: g.users.clone(),
            })),
            Event::DetailsUpdated(id, change) => {
                wire::sub(Sub::PlayerDetailsUpdatedMessage(pb::PlayerDetailsUpdatedMessage {
                    user_id: id,
                    details: Some(wire::details_to(change)),
                }))
            }
            Event::JoinGroupSpace(g) => wire::direct(Top::JoinSpaceRequestMessage(pb::JoinSpaceRequestMessage {
                space_name: g.space_name.clone(),
                properties_to_sync: ["cameraState", "microphoneState", "screenSharingState"]
                    .map(String::from)
                    .to_vec(),
            })),
            Event::LeaveGroupSpace(name) => {
                wire::direct(Top::LeaveSpaceRequestMessage(pb::LeaveSpaceRequestMessage {
                    space_name: name.to_owned(),
                }))
            }
        };
        self.each(to, &frame);
    }
}

async fn run(mut room: Room, mut mailbox: tokio::sync::mpsc::Receiver<RoomCmd>, registry: Arc<ActorRegistry<RoomCmd>>) {
    let url = room.url().to_owned();
    METRICS.nb_rooms.inc();
    let mut sessions: HashMap<UserId, Arc<Session>> = HashMap::new();
    let mut groups_seen = 0u64;
    let mut group_gauge = 0i64;

    while let Some(cmd) = mailbox.recv().await {
        match cmd {
            RoomCmd::Join { session, request } => {
                if session.is_ended() {
                    continue;
                }
                let joined = room.join(
                    request,
                    &mut Fanout {
                        sessions: &mut sessions,
                        joining: Some(session.clone()),
                    },
                );
                if joined.duplicate {
                    session.push(wire::direct(
                        pb::server_to_client_message::Message::DuplicateUserConnectedMessage(
                            pb::DuplicateUserConnectedMessage {},
                        ),
                    ));
                }
                if let Some(old) = joined.replaced.and_then(|id| sessions.remove(&id)) {
                    old.end();
                    dec_room_gauge(&METRICS.nb_clients_per_room, &url);
                }
                METRICS.nb_clients_per_room.with_label_values(&[&url]).inc();
            }
            RoomCmd::Leave { session } => {
                let Some(user) = session.user_id() else { continue };
                room.leave(user, &mut Fanout::new(&mut sessions));
                if sessions.remove(&user).is_some() {
                    dec_room_gauge(&METRICS.nb_clients_per_room, &url);
                }
            }
            RoomCmd::Move {
                user,
                position,
                viewport,
            } => {
                let mut out = Fanout::new(&mut sessions);
                room.move_user(user, position, &mut out);
                if let Some(v) = viewport {
                    room.set_viewport(user, v, &mut out);
                }
            }
            RoomCmd::Viewport { user, viewport } => {
                room.set_viewport(user, viewport, &mut Fanout::new(&mut sessions));
            }
            RoomCmd::Details { user, change } => room.update_details(user, change, &mut Fanout::new(&mut sessions)),
            RoomCmd::AskPosition {
                user,
                target_uuid,
                target_id,
                locate,
            } => {
                use pb::server_to_client_message::Message as Top;
                let (Some(target), Some(session)) = (room.find(&target_uuid, target_id), sessions.get(&user)) else {
                    continue;
                };
                let position = Some(wire::position_to(&target.position));
                session.push(wire::direct(if locate {
                    Top::LocatePositionMessage(pb::LocatePositionMessage {
                        position,
                        user_id: target.id,
                        user_uuid: target.profile.uuid.clone(),
                    })
                } else {
                    Top::MoveToPositionMessage(pb::MoveToPositionMessage { position })
                }));
            }
        }
        // Group metrics, from the counters of the core.
        let created = room.groups_created();
        if created > groups_seen {
            METRICS.counter_groups_per_room.with_label_values(&[&url]).inc_by(created - groups_seen);
            groups_seen = created;
        }
        let groups = room.group_count() as i64;
        if groups != group_gauge {
            if groups == 0 {
                let _ = METRICS.nb_groups_per_room.remove_label_values(&[&url]);
            } else {
                METRICS.nb_groups_per_room.with_label_values(&[&url]).set(groups);
            }
            group_gauge = groups;
        }
    }
    // Nobody holds a handle on this room any more.
    registry.forget_dead(&url);
    METRICS.nb_rooms.dec();
}
