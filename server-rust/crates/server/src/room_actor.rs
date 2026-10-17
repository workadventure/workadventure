//! The owner of one room: a task with a bounded mailbox. Rooms run in parallel on every core; inside a room
//! the logic is sequential, and the fan-out only pushes shared bytes into the recipients' outboxes (their
//! writer tasks, on any core, do the rest).

use std::collections::{HashMap, VecDeque};
use std::sync::Arc;

use tokio::task::JoinSet;

use wa_core::geometry::{Position, Viewport};
use wa_core::room::{Clock, Event, JoinRequest, Room, Sink, UserId};
use wa_core::user::DetailsChange;
use wa_core::areas::{self, AreaVariables, VarKey};
use wa_core::social::{FollowMsg, Follows, Invitations};
use wa_core::variables::{RoomVariables, VariableError, Writer};
use wa_core::wam::{Edit, Editor, History, Wam};
use wa_proto::messages as pb;

use crate::AppState;
use crate::custom_entities;
use crate::room_map;
use crate::local_admin;
use crate::map_storage::{CachedMap, MapChange, MapSlot, Storage};
use crate::session::SessionInfo;
use crate::metrics::{METRICS, dec_room_gauge};
use crate::outbox::Frame;
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
    Kick { uuid: String, reason: String, banned: bool },
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
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_or(0, |d| d.as_millis() as u64)
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

/// The WAM file of a map-storage room (back's WamManager + map-storage's MapsManager): edits apply here, in the
/// order they came, and a task of its own writes the newest version to disk. The file I/O an edit needs (custom
/// entities, private files, a reload) runs in a task: the room goes on with moves and the rest meanwhile, and
/// the edits after it wait their turn.
struct MapFile {
    rel: String,
    storage: Arc<Storage>,
    wam: Option<Wam>,
    /// The storage generation the file was read at.
    generation: u64,
    /// Counts the changes to the WAM; each save carries it, so an older one never lands after a newer one.
    revision: u64,
    history: History<pb::EditMapCommandMessage>,
    saves: tokio::sync::watch::Sender<Option<(u64, u64, Vec<u8>)>>,
    /// Waiting for the I/O in flight to finish, in order.
    queue: VecDeque<Pending>,
    /// At most one task: the I/O in flight.
    io: JoinSet<Done>,
    /// The map's lock, held for the room's life; the map goes back into it when the room ends.
    slot: tokio::sync::OwnedMutexGuard<Option<CachedMap>>,
}

// A few at a time per map: not worth boxing the command.
#[allow(clippy::large_enum_variant)]
enum Pending {
    Edit {
        session: Arc<Session>,
        command: pb::EditMapCommandMessage,
    },
    /// Files of openFile properties whose link went away.
    Remove(Vec<String>),
    /// The files changed over HTTP: read the WAM again.
    Load,
}

#[allow(clippy::large_enum_variant)]
enum Done {
    Edit {
        session: Arc<Session>,
        command: pb::EditMapCommandMessage,
        result: Result<(), String>,
    },
    Removed,
    Loaded {
        generation: u64,
        wam: Option<Wam>,
    },
}

/// What the room tells its users.
#[allow(clippy::large_enum_variant)]
enum Outcome {
    /// The command for everyone (as map-storage rewrites it), or the reason for its sender.
    Edited {
        session: Arc<Session>,
        id: String,
        result: Result<pb::EditMapCommandMessage, String>,
    },
    Reloaded,
}

impl Drop for MapFile {
    fn drop(&mut self) {
        *self.slot = Some(CachedMap {
            wam: self.wam.take(),
            history: std::mem::take(&mut self.history),
            generation: self.generation,
            revision: self.revision,
        });
    }
}

impl MapFile {
    async fn open(storage: Arc<Storage>, rel: String) -> Self {
        let (saves, mut pending) = tokio::sync::watch::channel(None::<(u64, u64, Vec<u8>)>);
        let (store, path) = (storage.clone(), rel.clone());
        // Writes the newest version only; ends after the last one once the room is gone.
        tokio::spawn(async move {
            while pending.changed().await.is_ok() {
                let Some((generation, revision, bytes)) = pending.borrow_and_update().clone() else { continue };
                store.save(&path, generation, revision, bytes).await;
            }
        });
        // A room for this map that is still ending gives it back first.
        let slot: MapSlot = storage.map_slot(&rel);
        let mut slot = slot.lock_owned().await;
        let cached = slot.take();
        let mut map = Self {
            rel,
            storage: storage.clone(),
            wam: None,
            generation: 0,
            revision: 0,
            history: History::default(),
            saves,
            queue: VecDeque::new(),
            io: JoinSet::new(),
            slot,
        };
        match cached {
            // Not changed over HTTP since: the copy in memory is the latest, with its recent edits.
            Some(c) if c.generation == storage.generation(&map.rel) => {
                map.wam = c.wam;
                map.history = c.history;
                map.generation = c.generation;
                map.revision = c.revision;
            }
            _ => {
                let generation = storage.generation(&map.rel);
                let wam = storage.read(&map.rel).await.and_then(|b| Wam::parse(&b));
                map.loaded(generation, wam);
            }
        }
        map
    }

    fn loaded(&mut self, generation: u64, wam: Option<Wam>) {
        self.generation = generation;
        self.wam = wam;
        self.history.clear();
        self.revision = self.revision.max(self.storage.revision(&self.rel));
    }

    fn submit(&mut self, pending: Pending) -> Vec<Outcome> {
        self.queue.push_back(pending);
        self.pump()
    }

    /// The I/O in flight finished: what it means, then the next ones in the queue.
    fn finish(&mut self, done: Done) -> Vec<Outcome> {
        let mut out = Vec::new();
        match done {
            Done::Edit { session, command, result } => out.push(self.complete(session, command, result)),
            Done::Removed => {}
            Done::Loaded { generation, wam } => {
                self.loaded(generation, wam);
                out.push(Outcome::Reloaded);
            }
        }
        out.extend(self.pump());
        out
    }

    /// Applies what waits, up to the next I/O, which starts.
    fn pump(&mut self) -> Vec<Outcome> {
        let mut out = Vec::new();
        while self.io.is_empty()
            && let Some(pending) = self.queue.pop_front()
        {
            let storage = self.storage.clone();
            match pending {
                Pending::Load => {
                    let rel = self.rel.clone();
                    self.io.spawn(async move {
                        let generation = storage.generation(&rel);
                        let wam = storage.read(&rel).await.and_then(|b| Wam::parse(&b));
                        Done::Loaded { generation, wam }
                    });
                }
                Pending::Remove(paths) => {
                    self.io.spawn(async move {
                        for path in paths {
                            storage.remove_asset(&path).await;
                        }
                        Done::Removed
                    });
                }
                Pending::Edit { session, command } => {
                    if let Some(outcome) = self.start(storage, session, command) {
                        out.push(outcome);
                    }
                }
            }
        }
        out
    }

    /// Starts the I/O of an editor command (MapStorageServer.handleEditMapCommandWithKeyMessage), or applies it
    /// at once when it has none.
    fn start(
        &mut self,
        storage: Arc<Storage>,
        session: Arc<Session>,
        mut command: pb::EditMapCommandMessage,
    ) -> Option<Outcome> {
        use pb::edit_map_message::Message as M;
        let io = matches!(
            command.edit_map_message.as_ref().and_then(|m| m.message.as_ref()),
            Some(M::UploadEntityMessage(_) | M::ModifyCustomEntityMessage(_) | M::DeleteCustomEntityMessage(_) | M::UploadFileMessage(_))
        );
        if !io || self.wam.is_none() {
            return Some(self.complete(session, command, Ok(())));
        }
        self.io.spawn(async move {
            let info = &session.info;
            let editor = Editor {
                uuid: &info.user_uuid,
                tags: &info.tags,
                can_edit: info.can_edit,
            };
            let result = match command.edit_map_message.as_mut().and_then(|m| m.message.as_mut()) {
                Some(M::UploadEntityMessage(m)) => {
                    m.owner_id = Some(info.user_uuid.clone());
                    custom_entities::upload(&storage, m).await
                }
                Some(M::ModifyCustomEntityMessage(m)) => custom_entities::modify(&storage, m, editor).await,
                Some(M::DeleteCustomEntityMessage(m)) => custom_entities::delete(&storage, &m.id, editor).await,
                Some(M::UploadFileMessage(m)) => {
                    let uploaded = custom_entities::upload_file(&storage, m).await;
                    m.file.clear();
                    uploaded
                }
                _ => Ok(()),
            };
            Done::Edit { session, command, result }
        });
        None
    }

    /// The WAM side of a command whose I/O, if any, went through: the command as the room gets it back.
    fn complete(&mut self, session: Arc<Session>, command: pb::EditMapCommandMessage, io: Result<(), String>) -> Outcome {
        let id = command.id.clone();
        let result = io.and_then(|()| self.apply(command, &session.info));
        Outcome::Edited { session, id, result }
    }

    fn apply(&mut self, command: pb::EditMapCommandMessage, info: &SessionInfo) -> Result<pb::EditMapCommandMessage, String> {
        use pb::edit_map_message::Message as M;
        let editor = Editor {
            uuid: &info.user_uuid,
            tags: &info.tags,
            can_edit: info.can_edit,
        };
        let wam = self.wam.as_mut().ok_or("This map cannot be edited")?;
        let wam_changed = match command.edit_map_message.as_ref().and_then(|m| m.message.as_ref()) {
            // Done by the I/O: the custom entity collection and the private files are not in the WAM.
            Some(M::UploadEntityMessage(_) | M::ModifyCustomEntityMessage(_) | M::UploadFileMessage(_)) => false,
            Some(M::DeleteCustomEntityMessage(m)) => {
                wam.apply(&command.id, Edit::DeleteCustomEntity(m.id.clone()), editor)?;
                true
            }
            Some(other) => {
                let edit = wire::edit_from(other).ok_or("This map edit is not supported by this server yet")?;
                let dropped: Vec<String> = wam
                    .apply(&command.id, edit, editor)?
                    .dropped_files
                    .iter()
                    .map(|link| custom_entities::link_path(link))
                    .filter(|path| path.starts_with("/private/files/"))
                    .collect();
                if !dropped.is_empty() {
                    // Before the commands after this one: one of them may upload a file of the same name.
                    self.queue.push_front(Pending::Remove(dropped));
                }
                true
            }
            None => return Err("Empty map edit".into()),
        };
        self.history.push(SystemClock.now_ms(), command.id.clone(), command.clone());
        if wam_changed {
            self.revision += 1;
            self.saves.send_replace(Some((self.generation, self.revision, wam.to_json())));
        }
        Ok(command)
    }

    /// The I/O in flight, or never.
    async fn next_done(map: &mut Option<MapFile>) -> Done {
        loop {
            match map.as_mut().filter(|m| !m.io.is_empty()) {
                Some(m) => match m.io.join_next().await {
                    Some(Ok(done)) => return done,
                    Some(Err(e)) => tracing::error!(error = %e, "map file task failed"),
                    None => {}
                },
                None => std::future::pending().await,
            }
        }
    }

    /// The room is ending: whatever is queued still applies and saves (nobody is left to tell).
    async fn drain(&mut self) {
        let _ = self.pump();
        while let Some(done) = self.io.join_next().await {
            if let Ok(done) = done {
                let _ = self.finish(done);
            }
        }
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
    /// The room variables it may read.
    room_variables: Vec<pb::VariableMessage>,
    /// The items' last states.
    items: Vec<pb::ItemStateMessage>,
    /// The joining player's own variables.
    player_variables: Vec<pb::VariableMessage>,
}

impl<'a> Fanout<'a> {
    fn new(sessions: &'a mut HashMap<UserId, Arc<Session>>) -> Self {
        Self {
            sessions,
            joining: None,
            variables: Vec::new(),
            room_variables: Vec::new(),
            items: Vec::new(),
            player_variables: Vec::new(),
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
                        activated_invite_user: session.info.activated_invite_user,
                        user_room_token: session.info.user_room_token.clone(),
                        area_property_variable: std::mem::take(&mut self.variables),
                        variable: std::mem::take(&mut self.room_variables),
                        item: std::mem::take(&mut self.items),
                        player_variable: std::mem::take(&mut self.player_variables),
                        applications: session.info.applications.clone(),
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
            Event::Emote(actor, emote) => wire::sub(Sub::EmoteEventMessage(pb::EmoteEventMessage {
                actor_user_id: actor,
                emote: emote.to_owned(),
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

/// Tells the users what the map's edits and reloads gave.
fn deliver(
    outcomes: Vec<Outcome>,
    map: &Option<MapFile>,
    variables: &mut AreaVariables,
    room: &Room,
    sessions: &mut HashMap<UserId, Arc<Session>>,
    url: &str,
) {
    use pb::sub_message::Message as Sub;
    for outcome in outcomes {
        let ok = match &outcome {
            Outcome::Edited { result, .. } => result.is_ok(),
            Outcome::Reloaded => true,
        };
        if ok && let Some(wam) = map.as_ref().and_then(|m| m.wam.as_ref()) {
            let changes = variables.track(wam.areas(), room.positions());
            Fanout::new(sessions).variables(changes);
        }
        match outcome {
            // Everyone gets it, the sender included: its pending command is acknowledged by the id.
            Outcome::Edited { result: Ok(echo), .. } => {
                Fanout::new(sessions).each_all(&wire::sub(Sub::EditMapCommandMessage(echo)));
            }
            Outcome::Edited { session, id, result: Err(reason) } => {
                session.push(wire::sub(Sub::EditMapCommandMessage(pb::EditMapCommandMessage {
                    id,
                    edit_map_message: Some(pb::EditMapMessage {
                        message: Some(pb::edit_map_message::Message::ErrorCommandMessage(pb::ErrorCommandMessage {
                            reason,
                        })),
                    }),
                })));
            }
            // The users are asked to reload: the file they have is not the one the room now uses.
            Outcome::Reloaded => {
                let frame = wire::direct(pb::server_to_client_message::Message::RefreshRoomMessage(
                    pb::RefreshRoomMessage {
                        room_id: url.to_owned(),
                        version_number: 0,
                        time_to_refresh: Some(30),
                    },
                ));
                Fanout::new(sessions).each_all(&frame);
            }
        }
    }
}

/// VariablesManager.setVariable, then the room gets it (each user who may read it, the writer included) and
/// Redis too when it persists.
#[allow(clippy::too_many_arguments)]
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

async fn run(mut room: Room, mut mailbox: tokio::sync::mpsc::Receiver<RoomCmd>, app: AppState) {
    let (registry, storage) = (app.rooms.clone(), app.storage.clone());
    let url = room.url().to_owned();
    METRICS.nb_rooms.inc();
    // Like GameRoom.create, the WAM is read before anybody joins.
    let mut map = match local_admin::wam_path(&url) {
        Some(rel) => Some(MapFile::open(storage.clone(), rel).await),
        None => None,
    };
    // Like getVariableManager: the map is read, then the saved values, before anybody joins.
    let defs = room_map::variable_defs(&app, &url, map.as_ref().and_then(|m| Some((m.rel.as_str(), m.wam.as_ref()?)))).await;
    let mut room_vars = RoomVariables::new(defs.as_ref().ok().cloned());
    if room_vars.has_map() {
        room_vars.restore(app.redis.room_variables(&url).await);
    }
    let mut map_warning = defs.err();
    let mut vars_loaded = std::time::Instant::now();
    // A refused write may come from a map changed since: it is read again (at most every 10 s) and the writes
    // waiting for it are tried again.
    let mut map_reload: JoinSet<room_map::Defs> = JoinSet::new();
    let mut retries: Vec<(Arc<Session>, String, String)> = Vec::new();
    let mut var_listeners: Listeners<String> = Listeners::default();
    let mut event_listeners: Listeners<EventData> = Listeners::default();
    let mut variables = AreaVariables::default();
    let mut follows = Follows::default();
    let mut invitations = Invitations::default();
    // itemEventMessage: the last state of each item, for those who join later.
    let mut items: std::collections::BTreeMap<i32, String> = std::collections::BTreeMap::new();
    if let Some(wam) = map.as_ref().and_then(|m| m.wam.as_ref()) {
        variables.track(wam.areas(), std::iter::empty());
    }
    let mut sessions: HashMap<UserId, Arc<Session>> = HashMap::new();
    let mut groups_seen = 0u64;
    let mut group_gauge = 0i64;

    loop {
        use pb::server_to_client_message::Message as Top;
        let cmd = tokio::select! {
            cmd = mailbox.recv() => match cmd {
                Some(cmd) => cmd,
                None => break,
            },
            done = MapFile::next_done(&mut map) => {
                let outcomes = map.as_mut().map_or_else(Vec::new, |m| m.finish(done));
                deliver(outcomes, &map, &mut variables, &room, &mut sessions, &url);
                continue;
            }
            Some(Ok(defs)) = map_reload.join_next(), if !map_reload.is_empty() => {
                map_warning = defs.as_ref().err().copied();
                room_vars.reload(defs.ok());
                for (session, name, value) in std::mem::take(&mut retries) {
                    if let Err(e) = set_variable(&mut room_vars, &app, &url, &sessions, &mut var_listeners, player(&room, &session), &name, &value) {
                        refuse(&session, &e);
                    }
                }
                continue;
            }
        };
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
                let outcomes = match &mut map {
                    Some(m) => m.submit(Pending::Edit { session, command }),
                    None => vec![Outcome::Edited {
                        session,
                        id: command.id,
                        result: Err("This map cannot be edited".to_owned()),
                    }],
                };
                deliver(outcomes, &map, &mut variables, &room, &mut sessions, &url);
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
            RoomCmd::Event { sender, name, data, targets } => {
                event_listeners.send(&name, (data.clone(), sender));
                let frame = wire::sub(pb::sub_message::Message::ReceivedEventMessage(pb::ReceivedEventMessage {
                    name,
                    data,
                    sender_id: sender,
                }));
                let out = Fanout::new(&mut sessions);
                if targets.is_empty() {
                    out.each_all(&frame);
                } else {
                    out.each(&targets, &frame);
                }
            }
            RoomCmd::Social { session, act } => {
                let Some(me) = session.user_id().filter(|id| sessions.contains_key(id)) else { continue };
                let direct = |to: UserId, sessions: &HashMap<UserId, Arc<Session>>, m: Top| {
                    if let Some(s) = sessions.get(&to) {
                        s.push(wire::direct(m));
                    }
                };
                let others_in_group = |room: &Room| -> Vec<UserId> {
                    room.group_members(me).into_iter().filter(|u| *u != me).collect()
                };
                match act {
                    Social::FollowRequest(m) => {
                        for to in others_in_group(&room) {
                            direct(to, &sessions, Top::FollowRequestMessage(m));
                        }
                    }
                    Social::FollowConfirmation(m) => {
                        if room.user(m.leader).is_some() {
                            send_follow(follows.confirm(me, m.leader, &room.group_members(me)), &sessions);
                        }
                    }
                    Social::FollowAbort(m) => {
                        send_follow(follows.abort(me, m.leader), &sessions);
                        // Those who got the request and did not accept yet.
                        if me == m.leader {
                            for to in others_in_group(&room) {
                                direct(to, &sessions, Top::FollowAbortMessage(m));
                            }
                        }
                    }
                    Social::LockGroup(lock) => room.lock_group(me, lock, &mut Fanout::new(&mut sessions)),
                    Social::Emote(emote) => {
                        if wa_core::social::is_valid_emote(&emote) {
                            room.emote(me, &emote, &mut Fanout::new(&mut sessions));
                        }
                    }
                    Social::Item(m) => {
                        let state = m.state_json.clone();
                        Fanout::new(&mut sessions).each_all(&wire::sub(pb::sub_message::Message::ItemEventMessage(m.clone())));
                        items.insert(m.item_id, state);
                    }
                    Social::InvitationRequest(m) => {
                        let admin = session.info.tags.iter().any(|t| t == "admin");
                        if !admin && !invitations.try_send(SystemClock.now_ms(), &session.info.user_uuid, &m.receiver_user_uuid) {
                            session.push(wire::direct(Top::MeetingInvitationRequestTooHighMessage(
                                pb::MeetingInvitationRequestTooHighMessage {},
                            )));
                            continue;
                        }
                        let sender_name = room.user(me).map(|u| u.profile.name.clone()).unwrap_or_default();
                        for to in room.ids_of(&m.receiver_user_uuid).into_iter().filter(|u| *u != me) {
                            let received = pb::MeetingInvitationRequestReceivedMessage {
                                sender_user_uuid: session.info.user_uuid.clone(),
                                sender_play_uri: url.clone(),
                                sender_name: sender_name.clone(),
                                sender_user_id: Some(me),
                            };
                            direct(to, &sessions, Top::MeetingInvitationRequestReceivedMessage(received));
                        }
                    }
                    Social::InvitationResponse(m) => {
                        let responder_name = room.user(me).map(|u| u.profile.name.clone()).unwrap_or_default();
                        for to in room.ids_of(&m.request_sender_user_uuid).into_iter().filter(|u| *u != me) {
                            let received = pb::MeetingInvitationResponseReceivedMessage {
                                accepted: m.accept,
                                responder_name: responder_name.clone(),
                            };
                            direct(to, &sessions, Top::MeetingInvitationResponseReceivedMessage(received));
                        }
                        if m.accept {
                            invitations.clear(&m.request_sender_user_uuid);
                        }
                        // The responder's other tabs close their popup.
                        for to in room.ids_of(&session.info.user_uuid).into_iter().filter(|u| *u != me) {
                            direct(to, &sessions, Top::MeetingInvitationRequestClosedMessage(pb::MeetingInvitationRequestClosedMessage {}));
                        }
                    }
                    Social::Kick { uuid, reason, banned } => {
                        // SocketManager.banUser: out of the room, told why, then the connection ends (4000).
                        for id in room.ids_of(&uuid) {
                            let changes = variables.moved(room.position_of(id), None);
                            send_follow(follows.left(id), &sessions);
                            room.leave(id, &mut Fanout::new(&mut sessions));
                            Fanout::new(&mut sessions).variables(changes);
                            if let Some(s) = sessions.remove(&id) {
                                dec_room_gauge(&METRICS.nb_clients_per_room, &url);
                                s.push(wire::direct(Top::BanUserMessage(pb::BanUserMessage {
                                    r#type: if banned { "banned" } else { "kicked" }.into(),
                                    message: reason.clone(),
                                })));
                                s.end_after_queued();
                            }
                        }
                    }
                }
            }
            RoomCmd::Api(cmd) => match cmd {
                RoomApiCmd::Read { name, reply } => {
                    let _ = reply.send(room_vars.get(&name).map(str::to_owned));
                }
                RoomApiCmd::Save { name, value, reply } => {
                    let saved = set_variable(&mut room_vars, &app, &url, &sessions, &mut var_listeners, Writer::RoomApi, &name, &value);
                    let _ = reply.send(saved.map_err(|e| e.to_string()));
                }
                RoomApiCmd::ListenVariable { name, tx } => var_listeners.add(name, tx),
                RoomApiCmd::ListenEvent { name, tx } => event_listeners.add(name, tx),
            },
            RoomCmd::Describe { reply } => {
                let _ = reply.send((url.clone(), sessions.len()));
            }
            RoomCmd::Variable { session, name, value } => {
                if !map_reload.is_empty() {
                    retries.push((session, name, value));
                    continue;
                }
                let Err(e) = set_variable(&mut room_vars, &app, &url, &sessions, &mut var_listeners, player(&room, &session), &name, &value) else {
                    continue;
                };
                if vars_loaded.elapsed() < std::time::Duration::from_secs(10) {
                    tracing::error!(%url, %name, "a variable was refused, and the map was read less than 10 seconds ago");
                    refuse(&session, &e);
                    continue;
                }
                tracing::warn!(%url, %name, "a variable was refused: reading the map again");
                vars_loaded = std::time::Instant::now();
                retries.push((session, name, value));
                let (app, url) = (app.clone(), url.clone());
                let wam = map.as_ref().and_then(|m| Some((m.rel.clone(), m.wam.clone()?)));
                map_reload.spawn(async move {
                    room_map::variable_defs(&app, &url, wam.as_ref().map(|(rel, wam)| (rel.as_str(), wam))).await
                });
            }
            RoomCmd::MapFiles(change) => {
                let Some(m) = map.as_mut().filter(|m| change.concerns(&m.rel)) else { continue };
                match change {
                    // The users are asked to reload: the file they have is not the one the room now uses.
                    MapChange::Replaced(_) => {
                        let outcomes = m.submit(Pending::Load);
                        deliver(outcomes, &map, &mut variables, &room, &mut sessions, &url);
                    }
                    // Like the back: deleteMapMessage, then the connection closes ("Map was deleted.").
                    MapChange::Deleted(_) => {
                        m.wam = None;
                        m.queue.clear();
                        let frame = wire::direct(Top::DeleteMapMessage(pb::DeleteMapMessage {}));
                        for s in sessions.values() {
                            s.push(frame.clone());
                            s.end_after_queued();
                        }
                    }
                }
            }
            RoomCmd::Join { session, request, player_variables } => {
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
                let readable = room_vars
                    .readable(&session.info.tags)
                    .into_iter()
                    .map(|(name, value)| pb::VariableMessage { name, value })
                    .collect();
                let joining = session.clone();
                let joined = room.join(
                    request,
                    &mut Fanout {
                        sessions: &mut sessions,
                        joining: Some(session.clone()),
                        variables: current,
                        room_variables: readable,
                        items: items
                            .iter()
                            .map(|(id, state)| pb::ItemStateMessage { item_id: *id, state_json: state.clone() })
                            .collect(),
                        player_variables,
                    },
                );
                if let Some(warning) = map_warning {
                    joining.push(wire::sub(pb::sub_message::Message::ErrorMessage(pb::ErrorMessage {
                        message: warning.to_owned(),
                    })));
                }
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
                send_follow(follows.left(user), &sessions);
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
            RoomCmd::Details { user, change } => {
                // A persisted variable reaches the player's other tabs, as their own (updateDataUserSameUUID).
                if change.variable.as_ref().is_some_and(|v| v.persist)
                    && let Some(uuid) = room.user(user).map(|u| u.profile.uuid.clone())
                {
                    let details = pb::SetPlayerDetailsMessage {
                        set_variable: wire::details_to(&change).set_variable,
                        ..Default::default()
                    };
                    for brother in room.ids_of(&uuid).into_iter().filter(|b| *b != user) {
                        if let Some(s) = sessions.get(&brother) {
                            s.push(wire::sub(pb::sub_message::Message::PlayerDetailsUpdatedMessage(
                                pb::PlayerDetailsUpdatedMessage { user_id: brother, details: Some(details.clone()) },
                            )));
                        }
                    }
                }
                room.update_details(user, change, &mut Fanout::new(&mut sessions));
            }
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
    if let Some(m) = &mut map {
        m.drain().await;
    }
    registry.forget_dead(&url);
    METRICS.nb_rooms.dec();
}
