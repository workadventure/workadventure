//! The owner of one room: a task with a bounded mailbox. Rooms run in parallel on every core; inside a room
//! the logic is sequential, and the fan-out only pushes shared bytes into the recipients' outboxes (their
//! writer tasks, on any core, do the rest).

use std::collections::{HashMap, VecDeque};
use std::sync::Arc;

use tokio::task::JoinSet;

use wa_core::areas::{self, AreaVariables, VarKey};
use wa_core::geometry::{Position, Viewport};
use wa_core::room::{Clock, Event, JoinRequest, Room, Sink, UserId};
use wa_core::social::{FollowMsg, Follows, Invitations};
use wa_core::user::DetailsChange;
use wa_core::variables::{RoomVariables, VariableError, Writer};
use wa_core::wam::{Edit, Editor, History, Wam};
use wa_proto::messages as pb;

use crate::AppState;
use crate::custom_entities;
use crate::map_storage::{CachedMap, MapChange, MapSlot, Storage};
use crate::metrics::{METRICS, dec_room_gauge};
use crate::outbox::Frame;
use crate::registry::ActorRegistry;
use crate::room_map;
use crate::session::Session;
use crate::session::SessionInfo;
use crate::wire;

mod admin;
mod fanout;
mod map_file;
mod social;
mod variables;

use fanout::*;
use map_file::*;

pub const MAILBOX: usize = 1024;

pub enum RoomCmd {
    /// The connection is up: roomConnectedMessage, with the map edits the client's copy of the WAM misses.
    Connect {
        session: Arc<Session>,
    },
    Join {
        session: Arc<Session>,
        request: JoinRequest,
        /// All its saved variables, for roomJoinedMessage.playerVariable.
        player_variables: Vec<pb::VariableMessage>,
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
    /// sendEventQuery (sender set) or the admin's global event: receivedEventMessage to every user, the sender
    /// included, or to the targets only (GameRoom.dispatchEvent).
    Event {
        sender: Option<UserId>,
        name: String,
        data: Option<prost_types::Value>,
        targets: Vec<UserId>,
    },
    /// Between players of the room: follow, bubble lock, emotes, items, invitations, kicks.
    Social {
        session: Arc<Session>,
        act: Social,
    },
    /// From the Room API.
    Api(RoomApiCmd),
    /// The admin socket watches this room: who is here now, then who comes and goes.
    AdminListen {
        tx: tokio::sync::mpsc::Sender<String>,
    },
    /// A ban from the admin socket: everyone of that player is sent away, as banned.
    AdminBan {
        uuid: String,
        reason: String,
    },
    /// From the admin: reload the room (dispatchRoomRefresh), a message to everyone, the world is full, a
    /// message of an external module to one user.
    Refresh,
    /// sendAdminMessageToRoom: the admin's /message leaves the type empty, a global message has one.
    AdminMessage {
        kind: String,
        message: String,
    },
    /// The room's group (map details): the world of the world-scoped player variables.
    Group(tokio::sync::oneshot::Sender<Option<String>>),
    /// Who is in the room (getWorldUsers), with the room's URL.
    Users(tokio::sync::oneshot::Sender<(String, Vec<WorldUser>)>),
    WorldFull,
    ExternalModule(pb::ExternalModuleMessage),
    /// For `GET /rooms`: the URL and the number of users.
    Describe {
        reply: tokio::sync::oneshot::Sender<(String, usize)>,
    },
    /// variableMessage: a room variable (WA.state).
    Variable {
        session: Arc<Session>,
        name: String,
        value: String,
    },
}

pub enum Social {
    FollowRequest(pb::FollowRequestMessage),
    FollowConfirmation(pb::FollowConfirmationMessage),
    FollowAbort(pb::FollowAbortMessage),
    LockGroup(bool),
    Emote(String),
    Item(pb::ItemEventMessage),
    InvitationRequest(pb::MeetingInvitationRequestMessage),
    InvitationResponse(pb::MeetingInvitationResponseMessage),
    /// banPlayerMessage with kick, from an admin (checked by the caller): every connection of that player.
    Kick {
        uuid: String,
        reason: String,
        banned: bool,
    },
}

pub type RoomHandle = tokio::sync::mpsc::Sender<RoomCmd>;

pub enum RoomApiCmd {
    /// The JSON text of a variable, whoever may read it.
    Read { name: String, reply: tokio::sync::oneshot::Sender<Option<String>> },
    /// Set as the Room API: the map's tag rules do not apply.
    Save { name: String, value: String, reply: tokio::sync::oneshot::Sender<Result<(), String>> },
    /// The next values of a variable (JSON text); none is replayed.
    ListenVariable { name: String, tx: tokio::sync::mpsc::Sender<String> },
    /// The events of that name, with their sender.
    ListenEvent { name: String, tx: tokio::sync::mpsc::Sender<(Option<prost_types::Value>, Option<UserId>)> },
}

struct SystemClock;
impl Clock for SystemClock {
    fn now_ms(&self) -> u64 {
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |d| d.as_millis() as u64)
    }
}

pub fn get_or_spawn(app: &AppState, url: &str) -> RoomHandle {
    app.rooms.get_or_spawn(url, || {
        let (tx, rx) = tokio::sync::mpsc::channel(MAILBOX);
        let room = Room::new(url, app.room_config, Box::new(SystemClock));
        tokio::spawn(run(room, rx, app.clone()));
        tx
    })
}

/// The Room API's listeners in a room: variable name or event name -> streams.
#[derive(Default)]
struct Listeners<T> {
    by_name: HashMap<String, Vec<tokio::sync::mpsc::Sender<T>>>,
}

impl<T: Clone> Listeners<T> {
    fn add(&mut self, name: String, tx: tokio::sync::mpsc::Sender<T>) {
        self.by_name.entry(name).or_default().push(tx);
    }

    /// To every live listener of `name`; a gone one is forgotten, a stuck one misses this value.
    fn send(&mut self, name: &str, value: T) {
        let Some(list) = self.by_name.get_mut(name) else { return };
        list.retain(|tx| !matches!(tx.try_send(value.clone()), Err(tokio::sync::mpsc::error::TrySendError::Closed(_))));
        if list.is_empty() {
            self.by_name.remove(name);
        }
    }
}

type EventData = (Option<prost_types::Value>, Option<UserId>);

/// The writer of a variable sent by a player.
fn player<'a>(room: &'a Room, session: &'a Session) -> Writer<'a> {
    Writer::User {
        name: room.find(&session.info.user_uuid, session.user_id()).map_or("", |u| u.profile.name.as_str()),
        tags: &session.info.tags,
    }
}

/// VariablesManager.setVariable, then the room gets it (each user who may read it, the writer included) and
/// Redis too when it persists.
#[allow(clippy::too_many_arguments)]
fn set_variable(
    vars: &mut RoomVariables,
    app: &AppState,
    url: &str,
    sessions: &HashMap<UserId, Arc<Session>>,
    listeners: &mut Listeners<String>,
    writer: Writer<'_>,
    name: &str,
    value: &str,
) -> Result<(), VariableError> {
    let Some(changed) = vars.set(name, value, writer)? else { return Ok(()) };
    listeners.send(name, value.to_owned());
    if changed.persist {
        app.redis.save_room_variable(url, name, value);
    }
    let frame = wire::sub(pb::sub_message::Message::VariableMessage(pb::VariableMessage {
        name: name.to_owned(),
        value: value.to_owned(),
    }));
    for s in sessions.values() {
        if changed.readable_by.as_ref().is_none_or(|tag| s.info.tags.contains(tag)) {
            s.push(frame.clone());
        }
    }
    Ok(())
}

fn member_join(info: &SessionInfo, name: &str, room: &str) -> String {
    serde_json::json!({"type": "MemberJoin", "data": {"uuid": info.user_uuid, "name": name, "ipAddress": info.ip_address, "roomId": room}}).to_string()
}

/// To every admin socket still there (one that cannot keep up misses the event).
fn tell_admins(admins: &mut Vec<tokio::sync::mpsc::Sender<String>>, event: &str) {
    admins
        .retain(|tx| !matches!(tx.try_send(event.to_owned()), Err(tokio::sync::mpsc::error::TrySendError::Closed(_))));
}

fn send_follow(messages: Vec<FollowMsg>, sessions: &HashMap<UserId, Arc<Session>>) {
    use pb::server_to_client_message::Message as Top;
    for m in messages {
        let (to, frame) = match m {
            FollowMsg::Confirmation { to, leader, follower } => {
                (to, Top::FollowConfirmationMessage(pb::FollowConfirmationMessage { leader, follower }))
            }
            FollowMsg::Abort { to, leader, follower } => {
                (to, Top::FollowAbortMessage(pb::FollowAbortMessage { leader, follower }))
            }
        };
        if let Some(s) = sessions.get(&to) {
            s.push(wire::direct(frame));
        }
    }
}

/// The back's answer to a refused variable: an error, then the connection ends.
fn refuse(session: &Session, e: &VariableError) {
    session.push(wire::direct(pb::server_to_client_message::Message::ErrorMessage(pb::ErrorMessage {
        message: e.to_string(),
    })));
    session.end_after_queued();
}

pub struct WorldUser {
    pub uuid: String,
    pub name: String,
    pub ip: String,
}

/// Every user in a room of the world (a room whose URL starts with it). None when a room does not answer
/// within a second: a partial list would hide users.
pub async fn world_users(app: &AppState, world: &str) -> Option<Vec<WorldUser>> {
    let asks = app.rooms.live().into_iter().map(|room| async move {
        let (tx, rx) = tokio::sync::oneshot::channel();
        room.send(RoomCmd::Users(tx)).await.ok()?;
        tokio::time::timeout(std::time::Duration::from_secs(1), rx).await.ok()?.ok()
    });
    let mut users = Vec::new();
    for answer in futures_util::future::join_all(asks).await {
        let (url, mut list) = answer?;
        if url.starts_with(world) {
            users.append(&mut list);
        }
    }
    Some(users)
}

/// A room and everything its task owns. Commands run one at a time, in order; I/O runs in other tasks.
struct RoomActor {
    room: Room,
    app: AppState,
    url: String,
    map: Option<MapFile>,
    room_vars: RoomVariables,
    map_warning: Option<&'static str>,
    vars_loaded: std::time::Instant,
    map_reload: JoinSet<room_map::Defs>,
    retries: Vec<(Arc<Session>, String, String)>,
    var_listeners: Listeners<String>,
    event_listeners: Listeners<EventData>,
    variables: AreaVariables,
    follows: Follows,
    admins: Vec<tokio::sync::mpsc::Sender<String>>,
    version: i32,
    invitations: Invitations,
    items: std::collections::BTreeMap<i32, String>,
    sessions: HashMap<UserId, Arc<Session>>,
    groups_seen: u64,
    group_gauge: i64,
    registry: Arc<ActorRegistry<RoomCmd>>,
    details: serde_json::Value,
}

async fn run(room: Room, mut mailbox: tokio::sync::mpsc::Receiver<RoomCmd>, app: AppState) {
    let room = room;
    let (registry, storage) = (app.rooms.clone(), app.storage.clone());
    let url = room.url().to_owned();
    METRICS.nb_rooms.inc();
    // Like GameRoom.create, the WAM is read before anybody joins.
    let details = room_map::details(&app, &url).await;
    let map = match room_map::wam_key(&app, &url, &details) {
        Some(rel) => Some(MapFile::open(storage.clone(), rel).await),
        None => None,
    };
    // Like getVariableManager: the map is read, then the saved values, before anybody joins.
    let defs =
        room_map::variable_defs(&app, &url, map.as_ref().and_then(|m| Some((m.rel.as_str(), m.wam.as_ref()?)))).await;
    let mut room_vars = RoomVariables::new(defs.as_ref().ok().cloned());
    if room_vars.has_map() {
        room_vars.restore(app.redis.room_variables(&url).await);
    }
    let map_warning = defs.err();
    let vars_loaded = std::time::Instant::now();
    // A refused write may come from a map changed since: it is read again (at most every 10 s) and the writes
    // waiting for it are tried again.
    let map_reload: JoinSet<room_map::Defs> = JoinSet::new();
    let retries: Vec<(Arc<Session>, String, String)> = Vec::new();
    let var_listeners: Listeners<String> = Listeners::default();
    let event_listeners: Listeners<EventData> = Listeners::default();
    let mut variables = AreaVariables::default();
    let follows = Follows::default();
    // The admin sockets watching this room.
    let admins: Vec<tokio::sync::mpsc::Sender<String>> = Vec::new();
    // incrementVersion: each admin refresh of the room.
    let version = 0i32;
    let invitations = Invitations::default();
    // itemEventMessage: the last state of each item, for those who join later.
    let items: std::collections::BTreeMap<i32, String> = std::collections::BTreeMap::new();
    if let Some(wam) = map.as_ref().and_then(|m| m.wam.as_ref()) {
        variables.track(wam.areas(), std::iter::empty());
    }
    let sessions: HashMap<UserId, Arc<Session>> = HashMap::new();
    let groups_seen = 0u64;
    let group_gauge = 0i64;

    let mut a = RoomActor {
        room,
        app,
        url,
        map,
        room_vars,
        map_warning,
        vars_loaded,
        map_reload,
        retries,
        var_listeners,
        event_listeners,
        variables,
        follows,
        admins,
        version,
        invitations,
        items,
        sessions,
        groups_seen,
        group_gauge,
        registry,
        details,
    };
    loop {
        let cmd = tokio::select! {
            cmd = mailbox.recv() => match cmd {
                Some(cmd) => cmd,
                None => break,
            },
            done = MapFile::next_done(&mut a.map) => {
                let outcomes = a.map.as_mut().map_or_else(Vec::new, |m| m.finish(done));
                deliver(outcomes, &a.map, &mut a.variables, &a.room, &mut a.sessions, &a.url);
                continue;
            }
            Some(Ok(defs)) = a.map_reload.join_next(), if !a.map_reload.is_empty() => {
                a.map_warning = defs.as_ref().err().copied();
                a.room_vars.reload(defs.ok());
                for (session, name, value) in std::mem::take(&mut a.retries) {
                    if let Err(e) = set_variable(&mut a.room_vars, &a.app, &a.url, &a.sessions, &mut a.var_listeners, player(&a.room, &session), &name, &value) {
                        refuse(&session, &e);
                    }
                }
                continue;
            }
        };
        a.handle(cmd).await;
        a.metrics();
    }
    // Nobody holds a handle on this room any more.
    if let Some(m) = &mut a.map {
        m.drain().await;
    }
    a.registry.forget_dead(&a.url);
    METRICS.nb_rooms.dec();
}

impl RoomActor {
    async fn handle(&mut self, cmd: RoomCmd) {
        use pb::server_to_client_message::Message as Top;
        match cmd {
            RoomCmd::Connect { session } => {
                let commands = self.map.as_ref().map_or_else(Vec::new, |m| {
                    let latest = m.wam.as_ref().and_then(Wam::last_command_id);
                    m.history.after(session.info.last_command_id.as_deref(), latest).into_iter().cloned().collect()
                });
                session.push(wire::direct(Top::RoomConnectedMessage(pb::RoomConnectedMessage {
                    edit_map_commands_array_message: Some(pb::EditMapCommandsArrayMessage {
                        edit_map_commands: commands,
                    }),
                    tag: session.info.tags.clone(),
                })));
            }
            RoomCmd::Edit { session, command } => {
                let outcomes = match &mut self.map {
                    Some(m) => m.submit(Pending::Edit { session, command }),
                    None => vec![Outcome::Edited {
                        session,
                        id: command.id,
                        result: Err("This self.map cannot be edited".to_owned()),
                    }],
                };
                deliver(outcomes, &self.map, &mut self.variables, &self.room, &mut self.sessions, &self.url);
            }
            cmd @ (RoomCmd::SetAreaVariable { .. } | RoomCmd::Event { .. } | RoomCmd::Variable { .. }) => {
                self.variables(cmd).await
            }
            RoomCmd::Social { session, act } => self.social(session, act).await,
            cmd @ (RoomCmd::Api(_)
            | RoomCmd::AdminListen { .. }
            | RoomCmd::AdminBan { .. }
            | RoomCmd::Refresh
            | RoomCmd::AdminMessage { .. }
            | RoomCmd::Group(_)
            | RoomCmd::Users(_)
            | RoomCmd::WorldFull
            | RoomCmd::ExternalModule(_)
            | RoomCmd::Describe { .. }) => self.admin(cmd).await,
            RoomCmd::MapFiles(change) => {
                let Some(m) = self.map.as_mut().filter(|m| change.concerns(&m.rel)) else { return };
                match change {
                    // The users are asked to reload: the file they have is not the one the room now uses.
                    MapChange::Replaced(_) => {
                        let outcomes = m.submit(Pending::Load);
                        deliver(outcomes, &self.map, &mut self.variables, &self.room, &mut self.sessions, &self.url);
                    }
                    // Like the back: deleteMapMessage, then the connection closes ("Map was deleted.").
                    MapChange::Deleted(_) => {
                        m.wam = None;
                        m.queue.clear();
                        let frame = wire::direct(Top::DeleteMapMessage(pb::DeleteMapMessage {}));
                        for s in self.sessions.values() {
                            s.push(frame.clone());
                            s.end_after_queued();
                        }
                    }
                }
            }
            RoomCmd::Join { session, request, player_variables } => {
                if session.is_ended() {
                    return;
                }
                let at = (f64::from(request.position.x), f64::from(request.position.y));
                let changes = self.variables.moved(None, Some(at));
                let current = self
                    .variables
                    .all()
                    .map(|((area, property, key), value)| pb::AreaPropertyVariableMessage {
                        area_id: area.clone(),
                        property_id: property.clone(),
                        key: key.clone(),
                        value: value.clone(),
                    })
                    .collect();
                let readable = self
                    .room_vars
                    .readable(&session.info.tags)
                    .into_iter()
                    .map(|(name, value)| pb::VariableMessage { name, value })
                    .collect();
                let joining = session.clone();
                let joined = self.room.join(
                    request,
                    &mut Fanout {
                        sessions: &mut self.sessions,
                        joining: Some(session.clone()),
                        variables: current,
                        room_variables: readable,
                        items: self
                            .items
                            .iter()
                            .map(|(id, state)| pb::ItemStateMessage { item_id: *id, state_json: state.clone() })
                            .collect(),
                        player_variables,
                    },
                );
                if let Some(warning) = self.map_warning {
                    joining.push(wire::sub(pb::sub_message::Message::ErrorMessage(pb::ErrorMessage {
                        message: warning.to_owned(),
                    })));
                }
                Fanout::new(&mut self.sessions).variables(changes);
                if joined.duplicate {
                    session.push(wire::direct(pb::server_to_client_message::Message::DuplicateUserConnectedMessage(
                        pb::DuplicateUserConnectedMessage {},
                    )));
                }
                if let Some(old) = joined.replaced.and_then(|id| self.sessions.remove(&id)) {
                    old.end();
                    dec_room_gauge(&METRICS.nb_clients_per_room, &self.url);
                }
                METRICS.nb_clients_per_room.with_label_values(&[&self.url]).inc();
                if !self.admins.is_empty() {
                    let name = self.room.user(joined.user_id).map(|u| u.profile.name.clone()).unwrap_or_default();
                    tell_admins(&mut self.admins, &member_join(&session.info, &name, &self.url));
                }
            }
            RoomCmd::Leave { session } => {
                let Some(user) = session.user_id() else { return };
                let changes = self.variables.moved(self.room.position_of(user), None);
                send_follow(self.follows.left(user), &self.sessions);
                self.room.leave(user, &mut Fanout::new(&mut self.sessions));
                Fanout::new(&mut self.sessions).variables(changes);
                if self.sessions.remove(&user).is_some() {
                    dec_room_gauge(&METRICS.nb_clients_per_room, &self.url);
                    tell_admins(
                        &mut self.admins,
                        &serde_json::json!({"type": "MemberLeave", "data": {"uuid": session.info.user_uuid}})
                            .to_string(),
                    );
                }
            }
            RoomCmd::Move { user, position, viewport } => {
                let from = self.room.position_of(user);
                let mut out = Fanout::new(&mut self.sessions);
                self.room.move_user(user, position, &mut out);
                if let Some(v) = viewport {
                    self.room.set_viewport(user, v, &mut out);
                }
                if from.is_some() {
                    out.variables(self.variables.moved(from, self.room.position_of(user)));
                }
            }
            RoomCmd::Viewport { user, viewport } => {
                self.room.set_viewport(user, viewport, &mut Fanout::new(&mut self.sessions));
            }
            RoomCmd::Details { user, change } => {
                // A persisted variable reaches the player's other tabs, as their own (updateDataUserSameUUID).
                if change.variable.as_ref().is_some_and(|v| v.persist)
                    && let Some(uuid) = self.room.user(user).map(|u| u.profile.uuid.clone())
                {
                    let update = pb::SetPlayerDetailsMessage {
                        set_variable: wire::details_to(&change).set_variable,
                        ..Default::default()
                    };
                    for brother in self.room.ids_of(&uuid).into_iter().filter(|b| *b != user) {
                        if let Some(s) = self.sessions.get(&brother) {
                            s.push(wire::sub(pb::sub_message::Message::PlayerDetailsUpdatedMessage(
                                pb::PlayerDetailsUpdatedMessage { user_id: brother, details: Some(update.clone()) },
                            )));
                        }
                    }
                }
                self.room.update_details(user, change, &mut Fanout::new(&mut self.sessions));
            }
            RoomCmd::AskPosition { user, target_uuid, target_id, locate } => {
                let (Some(target), Some(session)) = (self.room.find(&target_uuid, target_id), self.sessions.get(&user))
                else {
                    return;
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
    }

    /// Group metrics, from the counters of the core.
    fn metrics(&mut self) {
        let created = self.room.groups_created();
        if created > self.groups_seen {
            METRICS.counter_groups_per_room.with_label_values(&[&self.url]).inc_by(created - self.groups_seen);
            self.groups_seen = created;
        }
        let groups = self.room.group_count() as i64;
        if groups != self.group_gauge {
            if groups == 0 {
                let _ = METRICS.nb_groups_per_room.remove_label_values(&[&self.url]);
            } else {
                METRICS.nb_groups_per_room.with_label_values(&[&self.url]).set(groups);
            }
            self.group_gauge = groups;
        }
    }
}
