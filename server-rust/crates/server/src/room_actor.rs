//! The owner of one room: a task with a bounded mailbox. Rooms run in parallel on every core; inside a room
//! the logic is sequential, and the fan-out only pushes shared bytes into the recipients' outboxes (their
//! writer tasks, on any core, do the rest).

use std::collections::HashMap;
use std::sync::Arc;

use wa_core::geometry::{Position, Viewport};
use wa_core::room::{Clock, Event, JoinRequest, Room, RoomConfig, Sink, UserId};
use wa_core::user::DetailsChange;
use wa_core::areas::{self, AreaVariables, VarKey};
use wa_core::wam::{Edit, Editor, History, Wam};
use wa_proto::messages as pb;

use crate::custom_entities;
use crate::local_admin;
use crate::map_storage::{CachedMap, MapChange, MapSlot, Storage};
use crate::session::SessionInfo;
use crate::metrics::{METRICS, dec_room_gauge};
use crate::outbox::Frame;
use crate::registry::ActorRegistry;
use crate::session::Session;
use crate::wire;

pub const MAILBOX: usize = 1024;

pub enum RoomCmd {
    /// The connection is up: roomConnectedMessage, with the map edits the client's copy of the WAM misses.
    Connect {
        session: Arc<Session>,
    },
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
    /// editMapCommandMessage.
    Edit {
        session: Arc<Session>,
        command: pb::EditMapCommandMessage,
    },
    /// Map files were changed over HTTP.
    MapFiles(MapChange),
    /// setAreaPropertyVariableMessage (a lock, for now).
    SetAreaVariable {
        session: Arc<Session>,
        variable: pb::SetAreaPropertyVariableMessage,
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

pub fn get_or_spawn(
    registry: &Arc<ActorRegistry<RoomCmd>>,
    url: &str,
    config: RoomConfig,
    storage: &Arc<Storage>,
) -> RoomHandle {
    registry.get_or_spawn(url, || {
        let (tx, rx) = tokio::sync::mpsc::channel(MAILBOX);
        let room = Room::new(url, config, Box::new(SystemClock));
        tokio::spawn(run(room, rx, registry.clone(), storage.clone()));
        tx
    })
}

/// The WAM file of a map-storage room (back's WamManager + map-storage's MapsManager): edits apply here, in the
/// room's order, and a task of its own writes the newest version to disk.
struct MapFile {
    rel: String,
    wam: Option<Wam>,
    /// The storage generation the file was read at.
    generation: u64,
    history: History<pb::EditMapCommandMessage>,
    saves: tokio::sync::watch::Sender<Option<(u64, Vec<u8>)>>,
    /// The map's lock, held for the room's life; the map goes back into it when the room ends.
    slot: tokio::sync::OwnedMutexGuard<Option<CachedMap>>,
}

impl Drop for MapFile {
    fn drop(&mut self) {
        *self.slot = Some(CachedMap {
            wam: self.wam.take(),
            history: std::mem::take(&mut self.history),
            generation: self.generation,
        });
    }
}

impl MapFile {
    async fn open(storage: Arc<Storage>, rel: String) -> Self {
        let (saves, mut pending) = tokio::sync::watch::channel(None::<(u64, Vec<u8>)>);
        let (store, path) = (storage.clone(), rel.clone());
        // Writes the newest version only; ends after the last one once the room is gone.
        tokio::spawn(async move {
            while pending.changed().await.is_ok() {
                let Some((generation, bytes)) = pending.borrow_and_update().clone() else { continue };
                store.save(&path, generation, &bytes).await;
            }
        });
        // A room for this map that is still ending gives it back first.
        let slot: MapSlot = storage.map_slot(&rel);
        let mut slot = slot.lock_owned().await;
        let cached = slot.take();
        let mut map = Self {
            rel,
            wam: None,
            generation: 0,
            history: History::default(),
            saves,
            slot,
        };
        match cached {
            // Not changed over HTTP since: the copy in memory is the latest, with its recent edits.
            Some(c) if c.generation == storage.generation(&map.rel) => {
                map.wam = c.wam;
                map.history = c.history;
                map.generation = c.generation;
            }
            _ => map.load(&storage).await,
        }
        map
    }

    async fn load(&mut self, storage: &Storage) {
        self.generation = storage.generation(&self.rel);
        self.wam = storage.read(&self.rel).await.and_then(|b| Wam::parse(&b));
        self.history.clear();
    }

    /// Applies an editor command (MapStorageServer.handleEditMapCommandWithKeyMessage) and returns what the room
    /// gets back: the command itself, or as map-storage rewrites it (owner of an upload, file bytes left out).
    async fn edit(
        &mut self,
        storage: &Storage,
        mut command: pb::EditMapCommandMessage,
        info: &SessionInfo,
    ) -> Result<pb::EditMapCommandMessage, String> {
        use pb::edit_map_message::Message as M;
        let editor = Editor {
            uuid: &info.user_uuid,
            tags: &info.tags,
            can_edit: info.can_edit,
        };
        let wam = self.wam.as_mut().ok_or("This map cannot be edited")?;
        let message = command.edit_map_message.as_mut().and_then(|m| m.message.as_mut());
        let mut wam_changed = true;
        match message {
            Some(M::UploadEntityMessage(m)) => {
                m.owner_id = Some(info.user_uuid.clone());
                custom_entities::upload(storage, m).await?;
                wam_changed = false;
            }
            Some(M::ModifyCustomEntityMessage(m)) => {
                custom_entities::modify(storage, m, editor).await?;
                wam_changed = false;
            }
            Some(M::DeleteCustomEntityMessage(m)) => {
                custom_entities::delete(storage, &m.id, editor).await?;
                wam.apply(&command.id, Edit::DeleteCustomEntity(m.id.clone()), editor)?;
            }
            Some(M::UploadFileMessage(m)) => {
                custom_entities::upload_file(storage, m).await?;
                m.file.clear();
                wam_changed = false;
            }
            Some(other) => {
                let edit = wire::edit_from(other).ok_or("This map edit is not supported by this server yet")?;
                let applied = wam.apply(&command.id, edit, editor)?;
                for link in applied.dropped_files {
                    let path = custom_entities::link_path(&link);
                    if path.starts_with("/private/files/") {
                        storage.remove_asset(&path).await;
                    }
                }
            }
            None => return Err("Empty map edit".into()),
        }
        self.history.push(SystemClock.now_ms(), command.id.clone(), command.clone());
        if wam_changed {
            self.saves.send_replace(Some((self.generation, wam.to_json())));
        }
        Ok(command)
    }
}

fn variable_frame((area, property, key): VarKey, value: String) -> Frame {
    wire::sub(pb::sub_message::Message::AreaPropertyVariableMessage(pb::AreaPropertyVariableMessage {
        area_id: area,
        property_id: property,
        key,
        value,
    }))
}

/// Encodes each event once, then hands the bytes to every recipient.
struct Fanout<'a> {
    sessions: &'a mut HashMap<UserId, Arc<Session>>,
    joining: Option<Arc<Session>>,
    /// The area variables a joining user gets in roomJoinedMessage.
    variables: Vec<pb::AreaPropertyVariableMessage>,
}

impl<'a> Fanout<'a> {
    fn new(sessions: &'a mut HashMap<UserId, Arc<Session>>) -> Self {
        Self {
            sessions,
            joining: None,
            variables: Vec::new(),
        }
    }

    fn variables(&self, changes: Vec<(VarKey, String)>) {
        for (key, value) in changes {
            self.each_all(&variable_frame(key, value));
        }
    }

    fn each_all(&self, frame: &Frame) {
        for s in self.sessions.values() {
            s.push(frame.clone());
        }
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
                        area_property_variable: std::mem::take(&mut self.variables),
                        applications: session.info.applications.clone(),
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

async fn run(
    mut room: Room,
    mut mailbox: tokio::sync::mpsc::Receiver<RoomCmd>,
    registry: Arc<ActorRegistry<RoomCmd>>,
    storage: Arc<Storage>,
) {
    let url = room.url().to_owned();
    METRICS.nb_rooms.inc();
    // Like GameRoom.create, the WAM is read before anybody joins.
    let mut map = match local_admin::wam_path(&url) {
        Some(rel) => Some(MapFile::open(storage.clone(), rel).await),
        None => None,
    };
    let mut variables = AreaVariables::default();
    if let Some(wam) = map.as_ref().and_then(|m| m.wam.as_ref()) {
        variables.track(wam.areas(), std::iter::empty());
    }
    let mut sessions: HashMap<UserId, Arc<Session>> = HashMap::new();
    let mut groups_seen = 0u64;
    let mut group_gauge = 0i64;

    while let Some(cmd) = mailbox.recv().await {
        use pb::server_to_client_message::Message as Top;
        match cmd {
            RoomCmd::Connect { session } => {
                let commands = map.as_ref().map_or_else(Vec::new, |m| {
                    let latest = m.wam.as_ref().and_then(Wam::last_command_id);
                    m.history
                        .after(session.info.last_command_id.as_deref(), latest)
                        .into_iter()
                        .cloned()
                        .collect()
                });
                session.push(wire::direct(Top::RoomConnectedMessage(pb::RoomConnectedMessage {
                    edit_map_commands_array_message: Some(pb::EditMapCommandsArrayMessage {
                        edit_map_commands: commands,
                    }),
                    tag: session.info.tags.clone(),
                })));
            }
            RoomCmd::Edit { session, command } => {
                use pb::sub_message::Message as Sub;
                let id = command.id.clone();
                let result = match &mut map {
                    Some(m) => m.edit(&storage, command, &session.info).await,
                    None => Err("This map cannot be edited".to_owned()),
                };
                if result.is_ok()
                    && let Some(wam) = map.as_ref().and_then(|m| m.wam.as_ref())
                {
                    let changes = variables.track(wam.areas(), room.positions());
                    Fanout::new(&mut sessions).variables(changes);
                }
                match result {
                    // Everyone gets it, the sender included: its pending command is acknowledged by the id.
                    Ok(echo) => Fanout::new(&mut sessions).each_all(&wire::sub(Sub::EditMapCommandMessage(echo))),
                    Err(reason) => session.push(wire::sub(Sub::EditMapCommandMessage(pb::EditMapCommandMessage {
                        id,
                        edit_map_message: Some(pb::EditMapMessage {
                            message: Some(pb::edit_map_message::Message::ErrorCommandMessage(
                                pb::ErrorCommandMessage { reason },
                            )),
                        }),
                    }))),
                }
            }
            RoomCmd::SetAreaVariable { session, variable: v } => {
                let Some(wam) = map.as_ref().and_then(|m| m.wam.as_ref()) else { continue };
                // A refusal is silent, as on the back.
                if areas::may_set(wam.areas(), &v.area_id, &v.property_id, &session.info.tags)
                    && variables.set(&v.area_id, &v.property_id, &v.key, &v.value)
                {
                    Fanout::new(&mut sessions).each_all(&variable_frame((v.area_id, v.property_id, v.key), v.value));
                }
            }
            RoomCmd::MapFiles(change) => {
                let Some(m) = map.as_mut().filter(|m| change.concerns(&m.rel)) else { continue };
                match change {
                    // The users are asked to reload: the file they have is not the one the room now uses.
                    MapChange::Replaced(_) => {
                        m.load(&storage).await;
                        if let Some(wam) = &m.wam {
                            let changes = variables.track(wam.areas(), room.positions());
                            Fanout::new(&mut sessions).variables(changes);
                        }
                        let frame = wire::direct(Top::RefreshRoomMessage(pb::RefreshRoomMessage {
                            room_id: url.clone(),
                            version_number: 0,
                            time_to_refresh: Some(30),
                        }));
                        Fanout::new(&mut sessions).each_all(&frame);
                    }
                    // Like the back: deleteMapMessage, then the connection closes ("Map was deleted.").
                    MapChange::Deleted(_) => {
                        m.wam = None;
                        let frame = wire::direct(Top::DeleteMapMessage(pb::DeleteMapMessage {}));
                        for s in sessions.values() {
                            s.push(frame.clone());
                            s.end_after_queued();
                        }
                    }
                }
            }
            RoomCmd::Join { session, request } => {
                if session.is_ended() {
                    continue;
                }
                let at = (f64::from(request.position.x), f64::from(request.position.y));
                let changes = variables.moved(None, Some(at));
                let current = variables
                    .all()
                    .map(|((area, property, key), value)| pb::AreaPropertyVariableMessage {
                        area_id: area.clone(),
                        property_id: property.clone(),
                        key: key.clone(),
                        value: value.clone(),
                    })
                    .collect();
                let joined = room.join(
                    request,
                    &mut Fanout {
                        sessions: &mut sessions,
                        joining: Some(session.clone()),
                        variables: current,
                    },
                );
                Fanout::new(&mut sessions).variables(changes);
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
                let changes = variables.moved(room.position_of(user), None);
                room.leave(user, &mut Fanout::new(&mut sessions));
                Fanout::new(&mut sessions).variables(changes);
                if sessions.remove(&user).is_some() {
                    dec_room_gauge(&METRICS.nb_clients_per_room, &url);
                }
            }
            RoomCmd::Move {
                user,
                position,
                viewport,
            } => {
                let from = room.position_of(user);
                let mut out = Fanout::new(&mut sessions);
                room.move_user(user, position, &mut out);
                if let Some(v) = viewport {
                    room.set_viewport(user, v, &mut out);
                }
                if from.is_some() {
                    out.variables(variables.moved(from, room.position_of(user)));
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
