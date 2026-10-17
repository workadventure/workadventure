//! A space: a set of players sharing presence, events and, for media spaces, peer-to-peer audio/video.
//!
//! Merges the pusher's Space/SpaceToFrontDispatcher and the back's Space/CommunicationManager with its
//! WebRTC strategy. LiveKit is not handled yet: a media space stays in peer-to-peer mode, which is also what
//! the reference does when no LiveKit is configured.

use std::collections::{BTreeSet, BTreeMap, HashMap, HashSet};

use crate::space_state::{self, Ctx, RecordingStatus, SpaceState, StateQuery};
use crate::user::{Availability, Texture};

pub type SpaceUserId = String;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FilterType {
    AllUsers,
    LiveStreamingUsers,
    LiveStreamingUsersWithFeedback,
}

/// The fields of a space member that a client may change itself (CLIENT_UPDATABLE_SPACE_USER_FIELDS).
pub const CLIENT_UPDATABLE: [&str; 6] = [
    "microphoneState",
    "cameraState",
    "screenSharingState",
    "megaphoneState",
    "attendeesState",
    "cpuLimited",
];

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct SpaceUser {
    pub space_user_id: SpaceUserId,
    pub name: String,
    pub play_uri: String,
    pub color: String,
    pub textures: Vec<Texture>,
    pub is_logged: bool,
    pub availability: Availability,
    pub room_name: Option<String>,
    pub visit_card_url: Option<String>,
    pub tags: Vec<String>,
    pub camera_state: bool,
    pub microphone_state: bool,
    pub screen_sharing_state: bool,
    pub megaphone_state: bool,
    pub uuid: String,
    pub chat_id: Option<String>,
    pub show_voice_indicator: bool,
    pub attendees_state: bool,
    pub cpu_limited: bool,
}

impl SpaceUser {
    /// Copies the masked boolean fields of `from`. Returns the paths that were applied.
    pub fn apply_client_update(&mut self, from: &SpaceUser, paths: &[String]) -> Vec<String> {
        let mut applied = Vec::new();
        for p in paths {
            let (dst, src) = match p.as_str() {
                "microphoneState" => (&mut self.microphone_state, from.microphone_state),
                "cameraState" => (&mut self.camera_state, from.camera_state),
                "screenSharingState" => (&mut self.screen_sharing_state, from.screen_sharing_state),
                "megaphoneState" => (&mut self.megaphone_state, from.megaphone_state),
                "attendeesState" => (&mut self.attendees_state, from.attendees_state),
                "cpuLimited" => (&mut self.cpu_limited, from.cpu_limited),
                _ => continue,
            };
            *dst = src;
            applied.push(p.clone());
        }
        applied
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JoinError {
    AlreadyMember,
    FilterMismatch,
}

#[derive(Debug)]
pub enum SpaceEvent<'a> {
    UserAdded(&'a SpaceUser),
    UserUpdated(&'a SpaceUser, &'a [String]),
    UserRemoved(&'a str),
    /// Every member the new watcher sees.
    InitUsers(Vec<&'a SpaceUser>, &'a BTreeMap<String, String>),
    /// The whole state, to a new member.
    StateReplace(&'a SpaceState),
    /// The state changed: the adapter sends the difference.
    StatePatch {
        before: &'a SpaceState,
        after: &'a SpaceState,
    },
    /// A delta of metadata, values as raw JSON.
    Metadata(&'a [(String, String)]),
    /// switchMessage: the recipient (`user`) now uses this strategy.
    Switch(&'a SpaceUser, Comm),
    /// finalizeSwitchMessage: the recipient drops what it kept of the previous strategy.
    FinalizeSwitch(&'a SpaceUser, Comm),
    /// livekitInvitationMessage: the adapter makes the recipient's token.
    LivekitInvite(&'a SpaceUser),
    LivekitDisconnect(&'a SpaceUser),
    /// The LiveKit room of the space must exist (true) or may go (false).
    LivekitRoom(bool),
    /// The adapter stops this egress (a recording the server ends: its recorder left, or the last publisher).
    StopEgress(&'a str),
    /// recordingUnexpectedlyStoppedMessage, to the recorder.
    RecordingUnexpectedlyStopped(&'a SpaceUser),
    WebRtcStart {
        sender: &'a SpaceUser,
        initiator: bool,
        connection_id: &'a str,
    },
    WebRtcDisconnect(&'a SpaceUser),
}

pub trait SpaceSink {
    fn emit(&mut self, recipients: &[&str], event: SpaceEvent<'_>);
}

fn emit(sink: &mut impl SpaceSink, to: &[&str], event: SpaceEvent<'_>) {
    if !to.is_empty() {
        sink.emit(to, event);
    }
}

/// How a media space carries audio and video (CommunicationType).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Comm {
    None,
    WebRtc,
    Livekit,
}

impl Comm {
    pub fn name(self) -> &'static str {
        match self {
            Comm::None => "NONE",
            Comm::WebRtc => "WEBRTC",
            Comm::Livekit => "LIVEKIT",
        }
    }
}

/// TransitionPolicy's inputs.
#[derive(Debug, Clone, Copy)]
pub struct MediaConfig {
    /// MAX_USERS_FOR_WEBRTC: above, LiveKit.
    pub max_webrtc: usize,
    /// LiveKit credentials are configured.
    pub livekit: bool,
    /// LIVEKIT_SWITCH_ON_CPU_LIMITATION: a CPU-limited user in a bubble of 3 or more moves it to LiveKit.
    pub switch_on_cpu: bool,
}

impl Default for MediaConfig {
    fn default() -> Self {
        Self { max_webrtc: 4, livekit: false, switch_on_cpu: true }
    }
}

/// Back to peer-to-peer this long after the space became small enough (restarted by each change).
pub const LIVEKIT_TO_WEBRTC_MS: u64 = 20_000;
/// The previous strategy is dropped this long after a switch.
pub const FINALIZE_SWITCH_MS: u64 = 5_000;

struct NoClock;
impl crate::room::Clock for NoClock {
    fn now_ms(&self) -> u64 {
        0
    }
}

pub struct Space {
    pub local_name: String,
    pub filter: FilterType,
    pub properties_to_sync: Vec<String>,
    /// In joining order.
    members: Vec<SpaceUser>,
    watchers: HashSet<SpaceUserId>,
    metadata: BTreeMap<String, String>,
    state: SpaceState,
    /// Peer-to-peer connections, stored both ways: (a, b) -> connection id. None for a non-media space.
    connections: Option<HashMap<(SpaceUserId, SpaceUserId), String>>,
    /// (watcher, member) links the watcher's front dropped when the member left its list (see follow_lists).
    dropped: HashSet<(SpaceUserId, SpaceUserId)>,
    /// Prefix of the connection ids, unique per space instance.
    id_prefix: String,
    next_connection: u64,
    comm: Comm,
    media: MediaConfig,
    clock: Box<dyn crate::room::Clock>,
    /// LiveKit: who holds an invitation, and whether the room is open (it opens with the first publisher).
    invited: BTreeSet<SpaceUserId>,
    room_open: bool,
    /// When the space goes back to peer-to-peer, if nothing changes until then.
    back_to_webrtc_at: Option<u64>,
    /// The strategy left behind by the last switch, and when its users drop it.
    finalize: Option<(Comm, u64)>,
    /// A recording is under way: the space stays on LiveKit.
    pub recording: bool,
    session: Option<Recording>,
}

/// One recording (RecordingManager's session): an egress of the LiveKit room to S3.
#[derive(Debug, Clone)]
pub struct Recording {
    pub session_id: String,
    pub recorder: SpaceUserId,
    pub status: RecordingStatus,
    pub egress_id: Option<String>,
    /// A stop asked while it was starting: done once it has started.
    stop_after_start: bool,
}

/// What to start: the egress of this space's room, into the recorder's folder.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StartEgress {
    pub session_id: String,
    pub recorder_uuid: String,
}

const MEDIA_PROPERTIES: [&str; 3] = ["cameraState", "microphoneState", "screenSharingState"];

impl Space {
    /// `id_prefix` must be unique per space instance (connection ids are derived from it).
    pub fn new(local_name: String, filter: FilterType, properties_to_sync: Vec<String>, id_prefix: String) -> Self {
        let media = properties_to_sync.iter().any(|p| MEDIA_PROPERTIES.contains(&p.as_str()));
        Self {
            local_name,
            filter,
            properties_to_sync,
            members: Vec::new(),
            watchers: HashSet::new(),
            metadata: BTreeMap::new(),
            state: space_state::empty(),
            connections: media.then(HashMap::new),
            dropped: HashSet::new(),
            id_prefix,
            next_connection: 0,
            comm: if media { Comm::WebRtc } else { Comm::None },
            media: MediaConfig::default(),
            clock: Box::new(NoClock),
            invited: BTreeSet::new(),
            room_open: false,
            back_to_webrtc_at: None,
            finalize: None,
            recording: false,
            session: None,
        }
    }

    /// The switch rules and the clock of the timers (the defaults never leave peer-to-peer).
    pub fn configure_media(&mut self, media: MediaConfig, clock: Box<dyn crate::room::Clock>) {
        self.media = media;
        self.clock = clock;
    }

    pub fn comm(&self) -> Comm {
        self.comm
    }

    pub fn is_empty(&self) -> bool {
        self.members.is_empty()
    }

    pub fn member(&self, id: &str) -> Option<&SpaceUser> {
        self.members.iter().find(|m| m.space_user_id == id)
    }

    fn member_mut(&mut self, id: &str) -> Option<&mut SpaceUser> {
        self.members.iter_mut().find(|m| m.space_user_id == id)
    }

    pub fn is_member(&self, id: &str) -> bool {
        self.member(id).is_some()
    }

    pub fn member_ids(&self) -> impl Iterator<Item = &str> {
        self.members.iter().map(|m| m.space_user_id.as_str())
    }

    pub fn state(&self) -> &SpaceState {
        &self.state
    }

    /// Whether `observer` gets `target` in its user list. With feedback, speakers see everyone on stage or in
    /// the audience, the audience only sees the speakers (LiveStreamingNotificationStrategy).
    fn sees(&self, observer: &SpaceUser, target: &SpaceUser) -> bool {
        match self.filter {
            FilterType::AllUsers => true,
            FilterType::LiveStreamingUsers => target.megaphone_state,
            FilterType::LiveStreamingUsersWithFeedback => {
                target.megaphone_state || (observer.megaphone_state && target.attendees_state)
            }
        }
    }

    /// The watchers that see `target`, as observers are now.
    fn watchers_seeing(&self, target: &SpaceUser) -> Vec<&str> {
        self.members
            .iter()
            .filter(|m| self.watchers.contains(&m.space_user_id) && self.sees(m, target))
            .map(|m| m.space_user_id.as_str())
            .collect()
    }

    pub fn join(&mut self, filter: FilterType, user: SpaceUser, sink: &mut impl SpaceSink) -> Result<(), JoinError> {
        if filter != self.filter {
            return Err(JoinError::FilterMismatch);
        }
        if self.is_member(&user.space_user_id) {
            return Err(JoinError::AlreadyMember);
        }
        self.members.push(user);
        let user = self.members.last().expect("just pushed");
        emit(sink, &self.watchers_seeing(user), SpaceEvent::UserAdded(user));
        Ok(())
    }

    /// What a joiner gets once its join was answered: the state, then the communication strategy.
    pub fn after_join(&mut self, id: &str, sink: &mut impl SpaceSink) {
        if !self.is_member(id) {
            return;
        }
        emit(sink, &[id], SpaceEvent::StateReplace(&self.state));
        // The policy first: on a switch, everyone is told, the joiner included.
        if self.evaluate(sink) {
            return;
        }
        let Some(user) = self.member(id) else { return };
        if self.comm != Comm::None && !self.watchers.contains(id) {
            emit(sink, &[id], SpaceEvent::Switch(user, self.comm));
        }
        self.livekit_reconcile(sink);
    }

    /// The member starts watching the space (addSpaceFilterMessage). Returns false if it is not a member.
    pub fn watch(&mut self, id: &str, sink: &mut impl SpaceSink) -> bool {
        if !self.is_member(id) {
            return false;
        }
        if !self.watchers.insert(id.to_owned()) {
            return true;
        }
        let me = self.member(id).expect("checked above");
        let users: Vec<&SpaceUser> = self.members.iter().filter(|u| self.sees(me, u)).collect();
        emit(sink, &[id], SpaceEvent::InitUsers(users, &self.metadata));
        self.reconcile(id, sink);
        self.livekit_reconcile(sink);
        self.evaluate(sink);
        true
    }

    pub fn unwatch(&mut self, id: &str, sink: &mut impl SpaceSink) {
        self.dropped.retain(|(a, b)| a != id && b != id);
        if self.watchers.remove(id) {
            self.disconnect_all(id, sink);
            self.livekit_reconcile(sink);
            self.evaluate(sink);
        }
    }

    /// Always succeeds: leaving a space one is not in is not an error for the front.
    pub fn leave(&mut self, id: &str, sink: &mut impl SpaceSink) {
        self.watchers.remove(id);
        self.dropped.retain(|(a, b)| a != id && b != id);
        // Watching or not, its peers are told before it disappears from the members.
        self.disconnect_all(id, sink);
        let Some(pos) = self.members.iter().position(|m| m.space_user_id == id) else { return };
        let user = self.members.remove(pos);
        emit(sink, &self.watchers_seeing(&user), SpaceEvent::UserRemoved(id));
        if let Some(c) = &mut self.connections {
            c.retain(|(a, b), _| a != id && b != id);
        }
        self.invited.remove(id);
        if self.session.as_ref().is_some_and(|r| r.recorder == id) {
            self.server_stops_recording(sink);
        }
        self.livekit_reconcile(sink);
        self.evaluate(sink);
        self.update_state(sink, |s| space_state::forget(s, id));
    }

    /// A client-side update (updateSpaceUserMessage). Fields outside CLIENT_UPDATABLE are ignored.
    pub fn update_from_client(&mut self, id: &str, from: &SpaceUser, paths: &[String], sink: &mut impl SpaceSink) {
        let Some(before) = self.member(id).cloned() else { return };
        let applied = self.member_mut(id).expect("checked above").apply_client_update(from, paths);
        if applied.is_empty() {
            return;
        }
        let changes = self.notify_updated(&before, &applied, sink);
        self.follow_lists(changes, sink);
        if self.member(id).is_some_and(|after| self.active(after) != self.active(&before)) {
            self.reconcile(id, sink);
            self.livekit_reconcile(sink);
        }
        if applied.iter().any(|p| p == "cpuLimited") {
            self.evaluate(sink);
        }
        if before.megaphone_state && !from.megaphone_state && applied.iter().any(|p| p == "megaphoneState") {
            self.update_state(sink, |s| space_state::stopped_streaming(s, id));
        }
    }

    /// Updates that come from the player details (setPlayerDetailsMessage), not from the space.
    pub fn update_from_details(
        &mut self,
        id: &str,
        availability: Availability,
        chat_id: Option<&str>,
        show_voice_indicator: Option<bool>,
        sink: &mut impl SpaceSink,
    ) {
        let Some(before) = self.member(id).cloned() else { return };
        let user = self.member_mut(id).expect("checked above");
        let mut paths = Vec::new();
        if availability != Availability::UNCHANGED && availability != user.availability {
            user.availability = availability;
            paths.push("availabilityStatus".to_owned());
        }
        if let Some(chat_id) = chat_id
            && user.chat_id.as_deref() != Some(chat_id)
        {
            user.chat_id = Some(chat_id.to_owned());
            paths.push("chatID".to_owned());
        }
        if let Some(show) = show_voice_indicator
            && user.show_voice_indicator != show
        {
            user.show_voice_indicator = show;
            paths.push("showVoiceIndicator".to_owned());
        }
        if !paths.is_empty() {
            let changes = self.notify_updated(&before, &paths, sink);
            self.follow_lists(changes, sink);
        }
    }

    /// Tells each watcher what the change of `before` means for its user list: an update, an arrival or a
    /// departure, judged with the watcher's role as it is now (the user itself included, as the pusher does).
    /// A watcher whose own role changed also gains or loses the users it now sees or no longer sees.
    /// Returns who started or stopped seeing whom: (watcher, member, sees now).
    fn notify_updated(
        &self,
        before: &SpaceUser,
        paths: &[String],
        sink: &mut impl SpaceSink,
    ) -> Vec<(SpaceUserId, SpaceUserId, bool)> {
        let id = before.space_user_id.as_str();
        let user = self.member(id).expect("checked by the caller");
        let (mut updated, mut added, mut removed) = (Vec::new(), Vec::new(), Vec::new());
        let mut seen = Vec::new();
        for w in self.members.iter().filter(|m| self.watchers.contains(&m.space_user_id)) {
            match (self.sees(w, before), self.sees(w, user)) {
                (true, true) => updated.push(w.space_user_id.as_str()),
                (false, true) => added.push(w.space_user_id.as_str()),
                (true, false) => removed.push(w.space_user_id.as_str()),
                (false, false) => {}
            }
        }
        emit(sink, &updated, SpaceEvent::UserUpdated(user, paths));
        emit(sink, &added, SpaceEvent::UserAdded(user));
        emit(sink, &removed, SpaceEvent::UserRemoved(id));
        seen.extend(added.iter().map(|w| (w.to_string(), id.to_owned(), true)));
        seen.extend(removed.iter().map(|w| (w.to_string(), id.to_owned(), false)));
        if self.filter == FilterType::LiveStreamingUsersWithFeedback && self.watchers.contains(id) {
            for other in &self.members {
                let o = other.space_user_id.as_str();
                match (self.sees(before, other), self.sees(user, other)) {
                    (false, true) => emit(sink, &[id], SpaceEvent::UserAdded(other)),
                    (true, false) => emit(sink, &[id], SpaceEvent::UserRemoved(o)),
                    _ => continue,
                }
                seen.push((id.to_owned(), o.to_owned(), self.sees(user, other)));
            }
        }
        seen
    }

    /// A front closes its connection to a member that leaves its list, without a word to the server
    /// (SimplePeer, observeUserLeft). When the member comes back into that list, the link is restarted: a
    /// disconnect to both ends (the other end may still hold its side, and a front ignores a start for a peer it
    /// has), then a new connection if one is wanted.
    fn follow_lists(&mut self, changes: Vec<(SpaceUserId, SpaceUserId, bool)>, sink: &mut impl SpaceSink) {
        if self.connections.is_none() {
            return;
        }
        for (watcher, member, sees) in changes {
            if watcher == member {
                continue;
            }
            if !sees {
                self.dropped.insert((watcher, member));
                continue;
            }
            if !self.dropped.remove(&(watcher.clone(), member.clone())) {
                continue;
            }
            self.dropped.remove(&(member.clone(), watcher.clone()));
            self.disconnect(&watcher, &member, sink);
            self.disconnect(&member, &watcher, sink);
            let wanted = match (self.member(&watcher), self.member(&member)) {
                (Some(w), Some(m)) => self.wants_connection(w, m),
                _ => false,
            };
            if wanted {
                self.establish(&watcher, &member, sink);
            }
        }
    }

    pub fn update_metadata(&mut self, id: &str, delta: Vec<(String, String)>, sink: &mut impl SpaceSink) {
        if delta.is_empty() || !self.is_member(id) {
            return;
        }
        for (k, v) in &delta {
            self.metadata.insert(k.clone(), v.clone());
        }
        let to: Vec<&str> = self.member_ids().collect();
        emit(sink, &to, SpaceEvent::Metadata(&delta));
    }

    /// A SpaceStateQuery from a member. `new_id` makes the ids of polls, answers and questions.
    pub fn state_query(
        &mut self,
        sender: &str,
        query: StateQuery,
        now: i64,
        new_id: &mut dyn FnMut() -> String,
        sink: &mut impl SpaceSink,
    ) -> Result<(), String> {
        let Some(user) = self.member(sender) else {
            return Err(format!("Could not find user {sender} in space {}", self.local_name));
        };
        let mut next = self.state.clone();
        space_state::apply(
            &mut next,
            &mut Ctx {
                sender: user,
                filter: self.filter,
                members: &self.members,
                now,
                new_id,
            },
            query,
        )?;
        self.set_state(next, sink);
        Ok(())
    }

    /// The only way the state changes: every member, watching or not, gets the difference.
    // ponytail: a whole copy per change, like the TypeScript server; patch ops built by each rule if polls grow big.
    fn update_state(&mut self, sink: &mut impl SpaceSink, change: impl FnOnce(&mut SpaceState)) {
        let mut next = self.state.clone();
        change(&mut next);
        self.set_state(next, sink);
    }

    fn set_state(&mut self, next: SpaceState, sink: &mut impl SpaceSink) {
        if next == self.state {
            return;
        }
        let before = std::mem::replace(&mut self.state, next);
        let to: Vec<&str> = self.member_ids().collect();
        emit(
            sink,
            &to,
            SpaceEvent::StatePatch {
                before: &before,
                after: &self.state,
            },
        );
    }

    /// meetingConnectionRestartMessage: the requester becomes the initiator of a new connection.
    /// meetingConnectionRestartMessage. Peer-to-peer: the requester becomes the initiator of a new connection
    /// with `peer`. LiveKit (no peer needed): a fresh invitation.
    pub fn restart_connection(
        &mut self,
        requester: &str,
        peer: Option<&str>,
        connection_id: Option<&str>,
        sink: &mut impl SpaceSink,
    ) {
        if self.comm == Comm::Livekit {
            // A fresh invitation (new token) for the one whose connection broke.
            if let Some(user) = self.member(requester).filter(|_| self.invited.contains(requester)) {
                emit(sink, &[requester], SpaceEvent::LivekitInvite(user));
            }
            return;
        }
        let (Some(conns), Some(peer)) = (&self.connections, peer) else { return };
        if !self.is_member(requester) || !self.is_member(peer) {
            return;
        }
        let existing = conns
            .get(&(requester.to_owned(), peer.to_owned()))
            .or_else(|| conns.get(&(peer.to_owned(), requester.to_owned())));
        match existing {
            None => self.establish(peer, requester, sink),
            Some(existing) if connection_id.is_some_and(|c| c != existing) => {}
            Some(_) => self.establish(peer, requester, sink),
        }
    }

    // ---------------------------------------------------------------- peer-to-peer

    /// Who publishes (the back's filterOneUser): everyone in a proximity space, the speakers in a broadcast, and
    /// the audience too with feedback.
    fn active(&self, u: &SpaceUser) -> bool {
        match self.filter {
            FilterType::AllUsers => true,
            FilterType::LiveStreamingUsers => u.megaphone_state,
            FilterType::LiveStreamingUsersWithFeedback => u.megaphone_state || u.attendees_state,
        }
    }

    /// WebRTCCommunicationStrategy: a watcher is connected to every member that publishes.
    fn wants_connection(&self, a: &SpaceUser, b: &SpaceUser) -> bool {
        (self.watchers.contains(&a.space_user_id) && self.active(b))
            || (self.watchers.contains(&b.space_user_id) && self.active(a))
    }

    /// Opens and closes `id`'s connections after it started watching or changed role: a speaker who leaves the
    /// stage is disconnected from the audience, and connected again when back on it.
    fn reconcile(&mut self, id: &str, sink: &mut impl SpaceSink) {
        let Some(me) = self.member(id).filter(|_| self.comm == Comm::WebRtc) else { return };
        let plan: Vec<(SpaceUserId, bool)> = self
            .members
            .iter()
            .filter(|m| m.space_user_id != id)
            .map(|m| (m.space_user_id.clone(), self.wants_connection(me, m)))
            .collect();
        for (other, want) in plan {
            let have = self.connected(id, &other) || self.connected(&other, id);
            if want && !have {
                self.establish(id, &other, sink);
            } else if !want && have {
                self.disconnect(id, &other, sink);
                self.disconnect(&other, id, sink);
            }
        }
    }

    fn connected(&self, a: &str, b: &str) -> bool {
        self.connections
            .as_ref()
            .is_some_and(|c| c.contains_key(&(a.to_owned(), b.to_owned())))
    }

    /// `u1` is the initiator side's peer: `u2` receives `initiator: true` with sender `u1`.
    fn establish(&mut self, u1: &str, u2: &str, sink: &mut impl SpaceSink) {
        self.next_connection += 1;
        let cid = format!("{}-{}", self.id_prefix, self.next_connection);
        let conns = self.connections.as_mut().expect("media space");
        conns.insert((u1.to_owned(), u2.to_owned()), cid.clone());
        conns.insert((u2.to_owned(), u1.to_owned()), cid.clone());
        let (Some(a), Some(b)) = (self.member(u1), self.member(u2)) else { return };
        emit(
            sink,
            &[u2],
            SpaceEvent::WebRtcStart {
                sender: a,
                initiator: true,
                connection_id: &cid,
            },
        );
        emit(
            sink,
            &[u1],
            SpaceEvent::WebRtcStart {
                sender: b,
                initiator: false,
                connection_id: &cid,
            },
        );
    }

    fn disconnect_all(&mut self, id: &str, sink: &mut impl SpaceSink) {
        // During a switch the old peer-to-peer links are left to the clients, which drop them on finalize.
        if self.comm != Comm::WebRtc {
            return;
        }
        let others: Vec<SpaceUserId> = self.member_ids().filter(|m| *m != id).map(str::to_owned).collect();
        for other in others {
            self.disconnect(id, &other, sink);
            self.disconnect(&other, id, sink);
        }
        if let Some(c) = &mut self.connections {
            c.retain(|(_, b), _| b != id);
        }
    }

    /// Tells `r` that `s` is gone, if they were connected.
    fn disconnect(&mut self, s: &str, r: &str, sink: &mut impl SpaceSink) {
        let conns = self.connections.as_mut().expect("media space");
        if conns.remove(&(s.to_owned(), r.to_owned())).is_none() {
            return;
        }
        if let Some(sender) = self.member(s) {
            emit(sink, &[r], SpaceEvent::WebRtcDisconnect(sender));
        }
    }

    // ---------------------------------------------------------------- strategy (CommunicationManager)

    /// TransitionPolicy: whether the space should leave its strategy, and for which.
    fn wanted(&self) -> Option<Comm> {
        let n = self.members.len();
        let cpu = self.media.switch_on_cpu && self.members.iter().any(|m| m.cpu_limited);
        match self.comm {
            Comm::WebRtc if self.media.livekit && (n > self.media.max_webrtc || (cpu && n > 2)) => Some(Comm::Livekit),
            Comm::Livekit if n <= self.media.max_webrtc && !self.recording && !cpu => Some(Comm::WebRtc),
            _ => None,
        }
    }

    /// After any change of who is there: to LiveKit at once, back to peer-to-peer after a quiet delay (each
    /// change restarts it). Returns whether the space switched now.
    pub fn evaluate(&mut self, sink: &mut impl SpaceSink) -> bool {
        match self.wanted() {
            Some(Comm::Livekit) => {
                self.back_to_webrtc_at = None;
                self.switch_to(Comm::Livekit, sink);
                true
            }
            Some(Comm::WebRtc) => {
                self.back_to_webrtc_at = Some(self.clock.now_ms() + LIVEKIT_TO_WEBRTC_MS);
                false
            }
            _ => {
                self.back_to_webrtc_at = None;
                false
            }
        }
    }

    /// Forces LiveKit (a recording starts in a peer-to-peer space).
    pub fn ensure_livekit(&mut self, sink: &mut impl SpaceSink) -> bool {
        match self.comm {
            Comm::Livekit => true,
            Comm::WebRtc if self.media.livekit => {
                self.back_to_webrtc_at = None;
                self.switch_to(Comm::Livekit, sink);
                true
            }
            _ => false,
        }
    }

    /// StateLifecycleManager.transitionTo.
    fn switch_to(&mut self, next: Comm, sink: &mut impl SpaceSink) {
        self.finish_switch(sink);
        let old = self.comm;
        for m in &self.members {
            emit(sink, &[m.space_user_id.as_str()], SpaceEvent::Switch(m, next));
        }
        self.comm = next;
        match next {
            Comm::Livekit => {
                self.invited.clear();
                self.room_open = false;
                self.livekit_reconcile(sink);
            }
            Comm::WebRtc => {
                if let Some(c) = &mut self.connections {
                    c.clear();
                }
                self.dropped.clear();
                let ids: Vec<SpaceUserId> = self.watchers.iter().cloned().collect();
                for id in ids {
                    self.reconcile(&id, sink);
                }
            }
            Comm::None => {}
        }
        self.finalize = Some((old, self.clock.now_ms() + FINALIZE_SWITCH_MS));
    }

    /// finalizeSwitchMessage to everyone: the previous strategy is gone.
    fn finish_switch(&mut self, sink: &mut impl SpaceSink) {
        let Some((old, _)) = self.finalize.take() else { return };
        for m in &self.members {
            emit(sink, &[m.space_user_id.as_str()], SpaceEvent::FinalizeSwitch(m, old));
        }
        match old {
            Comm::WebRtc => {
                if let Some(c) = &mut self.connections {
                    c.clear();
                }
            }
            Comm::Livekit => {
                self.invited.clear();
                if std::mem::take(&mut self.room_open) {
                    sink.emit(&[], SpaceEvent::LivekitRoom(false));
                }
            }
            Comm::None => {}
        }
    }

    /// The next time `tick` has something to do.
    pub fn next_deadline(&self) -> Option<u64> {
        [self.finalize.map(|(_, at)| at), self.back_to_webrtc_at].into_iter().flatten().min()
    }

    /// Runs the timers that are due.
    pub fn tick(&mut self, sink: &mut impl SpaceSink) {
        let now = self.clock.now_ms();
        if self.finalize.is_some_and(|(_, at)| at <= now) {
            self.finish_switch(sink);
        }
        if self.back_to_webrtc_at.is_some_and(|at| at <= now) {
            self.back_to_webrtc_at = None;
            if self.wanted() == Some(Comm::WebRtc) {
                self.switch_to(Comm::WebRtc, sink);
            }
        }
    }

    /// LivekitCommunicationStrategy: once a publisher is there the room opens, and every publisher and watcher
    /// holds an invitation; when the last publisher goes, everyone is disconnected and the room closes.
    fn livekit_reconcile(&mut self, sink: &mut impl SpaceSink) {
        if self.comm != Comm::Livekit {
            return;
        }
        let publishing = self.members.iter().any(|m| self.active(m));
        if publishing && !self.room_open {
            self.room_open = true;
            sink.emit(&[], SpaceEvent::LivekitRoom(true));
        }
        let should: BTreeSet<SpaceUserId> = if publishing {
            self.members
                .iter()
                .filter(|m| self.active(m) || self.watchers.contains(&m.space_user_id))
                .map(|m| m.space_user_id.clone())
                .collect()
        } else {
            BTreeSet::new()
        };
        let gone: Vec<SpaceUserId> = self.invited.difference(&should).cloned().collect();
        for id in gone {
            self.invited.remove(&id);
            if let Some(m) = self.member(&id) {
                emit(sink, &[id.as_str()], SpaceEvent::LivekitDisconnect(m));
            }
        }
        let new: Vec<SpaceUserId> = should.difference(&self.invited).cloned().collect();
        for id in new {
            if let Some(m) = self.member(&id) {
                emit(sink, &[id.as_str()], SpaceEvent::LivekitInvite(m));
            }
            self.invited.insert(id);
        }
        if !publishing && self.room_open {
            self.server_stops_recording(sink);
            self.room_open = false;
            sink.emit(&[], SpaceEvent::LivekitRoom(false));
        }
    }

    // ---------------------------------------------------------------- recording (RecordingManager)

    pub fn recording_session(&self) -> Option<&Recording> {
        self.session.as_ref()
    }

    /// SpaceState.recording follows the session.
    fn publish_recording(&mut self, sink: &mut impl SpaceSink) {
        let (recorder, status) = match &self.session {
            Some(r) => (Some(r.recorder.clone()), r.status),
            None => (None, RecordingStatus::Idle),
        };
        self.recording = self.session.is_some();
        self.update_state(sink, |s| {
            s.recording.recorder = recorder;
            s.recording.status = status;
            s.recording.recording = matches!(status, RecordingStatus::Recording | RecordingStatus::Stopping);
        });
    }

    /// startRecording: the space moves to LiveKit if needed, then the adapter starts the egress (Some). None:
    /// already started by that recorder. A room needs a publisher: without one, it fails.
    pub fn start_recording(
        &mut self,
        sender: &str,
        session_id: String,
        sink: &mut impl SpaceSink,
    ) -> Result<Option<StartEgress>, String> {
        let uuid = self.member(sender).ok_or("Unknown user")?.uuid.clone();
        if let Some(r) = &self.session {
            if r.recorder != sender {
                return Err(match r.status {
                    RecordingStatus::Starting => "Recording is already starting",
                    RecordingStatus::Stopping => "Recording is already stopping",
                    _ => "Recording already started",
                }
                .into());
            }
            return Ok(None);
        }
        self.session = Some(Recording {
            session_id: session_id.clone(),
            recorder: sender.to_owned(),
            status: RecordingStatus::Starting,
            egress_id: None,
            stop_after_start: false,
        });
        self.publish_recording(sink);
        if !self.ensure_livekit(sink) || !self.room_open {
            self.session = None;
            self.publish_recording(sink);
            return Err("Failed to start recording".into());
        }
        Ok(Some(StartEgress { session_id, recorder_uuid: uuid }))
    }

    /// The egress call answered: its id, or the failure.
    pub fn egress_started(&mut self, session_id: &str, egress_id: Result<String, ()>, sink: &mut impl SpaceSink) {
        let Some(r) = self.session.as_mut().filter(|r| r.session_id == session_id) else { return };
        match egress_id {
            Ok(id) => {
                r.egress_id.get_or_insert(id);
            }
            Err(()) => {
                self.session = None;
                self.publish_recording(sink);
                self.evaluate(sink);
            }
        }
    }

    /// stopRecording by a user: only its recorder. Returns the egress to stop now, if any.
    pub fn stop_recording(&mut self, sender: &str, sink: &mut impl SpaceSink) -> Result<Option<String>, String> {
        let Some(r) = &mut self.session else { return Ok(None) };
        if r.recorder != sender {
            return Err("User is not the one recording".into());
        }
        Ok(self.stop_session(sink))
    }

    fn stop_session(&mut self, sink: &mut impl SpaceSink) -> Option<String> {
        let r = self.session.as_mut()?;
        match r.status {
            RecordingStatus::Starting => {
                r.stop_after_start = true;
                None
            }
            RecordingStatus::Recording => {
                r.status = RecordingStatus::Stopping;
                let egress = r.egress_id.clone();
                self.publish_recording(sink);
                egress
            }
            _ => None,
        }
    }

    /// A stop the server decides (the recorder is gone, or the last publisher): the egress stops too.
    fn server_stops_recording(&mut self, sink: &mut impl SpaceSink) {
        if let Some(egress) = self.stop_session(sink) {
            sink.emit(&[], SpaceEvent::StopEgress(&egress));
        }
    }

    /// The egress_started webhook. Returns the egress to stop if a stop was asked meanwhile.
    pub fn webhook_started(&mut self, session_id: &str, egress_id: &str, sink: &mut impl SpaceSink) -> Option<String> {
        let r = self.session.as_mut().filter(|r| r.session_id == session_id)?;
        if r.egress_id.as_deref().is_some_and(|e| e != egress_id) {
            return None;
        }
        r.egress_id = Some(egress_id.to_owned());
        if r.status != RecordingStatus::Starting {
            return None;
        }
        r.status = RecordingStatus::Recording;
        let stop = r.stop_after_start;
        self.publish_recording(sink);
        if stop { self.stop_session(sink) } else { None }
    }

    /// The egress_ended webhook: the session is over; its recorder is told if nobody asked for it. Returns the
    /// recorder, for the admin's event.
    pub fn webhook_ended(&mut self, session_id: &str, sink: &mut impl SpaceSink) -> Option<SpaceUserId> {
        let r = self.session.take_if(|r| r.session_id == session_id)?;
        self.publish_recording(sink);
        if r.status != RecordingStatus::Stopping
            && let Some(m) = self.member(&r.recorder)
        {
            emit(sink, &[r.recorder.as_str()], SpaceEvent::RecordingUnexpectedlyStopped(m));
        }
        self.evaluate(sink);
        Some(r.recorder)
    }
}
