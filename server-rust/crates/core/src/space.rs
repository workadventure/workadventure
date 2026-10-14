//! A space: a set of players sharing presence, events and, for media spaces, peer-to-peer audio/video.
//!
//! Merges the pusher's Space/SpaceToFrontDispatcher and the back's Space/CommunicationManager with its
//! WebRTC strategy. LiveKit is not handled yet: a media space stays in peer-to-peer mode, which is also what
//! the reference does when no LiveKit is configured.

use std::collections::{BTreeMap, HashMap, HashSet};

use crate::space_state::{self, Ctx, SpaceState, StateQuery};
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
    /// Use peer-to-peer for this space.
    SwitchToWebRtc(&'a SpaceUser),
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
    /// Prefix of the connection ids, unique per space instance.
    id_prefix: String,
    next_connection: u64,
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
            id_prefix,
            next_connection: 0,
        }
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
    pub fn after_join(&self, id: &str, sink: &mut impl SpaceSink) {
        let Some(user) = self.member(id) else { return };
        emit(sink, &[id], SpaceEvent::StateReplace(&self.state));
        if self.connections.is_some() && !self.watchers.contains(id) {
            emit(sink, &[id], SpaceEvent::SwitchToWebRtc(user));
        }
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
        if self.connections.is_some() {
            let others: Vec<SpaceUserId> =
                self.member_ids().filter(|m| *m != id).map(str::to_owned).collect();
            for other in others {
                if !self.connected(id, &other) {
                    self.establish(id, &other, sink);
                }
            }
        }
        true
    }

    pub fn unwatch(&mut self, id: &str, sink: &mut impl SpaceSink) {
        if self.watchers.remove(id) {
            self.disconnect_all(id, sink);
        }
    }

    /// Always succeeds: leaving a space one is not in is not an error for the front.
    pub fn leave(&mut self, id: &str, sink: &mut impl SpaceSink) {
        self.watchers.remove(id);
        // Watching or not, its peers are told before it disappears from the members.
        self.disconnect_all(id, sink);
        let Some(pos) = self.members.iter().position(|m| m.space_user_id == id) else { return };
        let user = self.members.remove(pos);
        emit(sink, &self.watchers_seeing(&user), SpaceEvent::UserRemoved(id));
        if let Some(c) = &mut self.connections {
            c.retain(|(a, b), _| a != id && b != id);
        }
        self.update_state(sink, |s| space_state::forget(s, id));
    }

    /// A client-side update (updateSpaceUserMessage). Fields outside CLIENT_UPDATABLE are ignored.
    pub fn update_from_client(&mut self, id: &str, from: &SpaceUser, paths: &[String], sink: &mut impl SpaceSink) {
        let Some(before) = self.member(id).cloned() else { return };
        let applied = self.member_mut(id).expect("checked above").apply_client_update(from, paths);
        if applied.is_empty() {
            return;
        }
        self.notify_updated(&before, &applied, sink);
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
            self.notify_updated(&before, &paths, sink);
        }
    }

    /// Tells each watcher what the change of `before` means for its user list: an update, an arrival or a
    /// departure. A watcher whose own role changed also gains or loses the users it now sees or no longer sees.
    fn notify_updated(&self, before: &SpaceUser, paths: &[String], sink: &mut impl SpaceSink) {
        let id = before.space_user_id.as_str();
        let user = self.member(id).expect("checked by the caller");
        let (mut updated, mut added, mut removed) = (Vec::new(), Vec::new(), Vec::new());
        for w in self.members.iter().filter(|m| self.watchers.contains(&m.space_user_id)) {
            let observer_before = if w.space_user_id == id { before } else { w };
            match (self.sees(observer_before, before), self.sees(w, user)) {
                (true, true) => updated.push(w.space_user_id.as_str()),
                (false, true) => added.push(w.space_user_id.as_str()),
                (true, false) => removed.push(w.space_user_id.as_str()),
                (false, false) => {}
            }
        }
        emit(sink, &updated, SpaceEvent::UserUpdated(user, paths));
        emit(sink, &added, SpaceEvent::UserAdded(user));
        emit(sink, &removed, SpaceEvent::UserRemoved(id));
        if self.filter == FilterType::LiveStreamingUsersWithFeedback && self.watchers.contains(id) {
            for other in self.members.iter().filter(|m| m.space_user_id != id) {
                match (self.sees(before, other), self.sees(user, other)) {
                    (false, true) => emit(sink, &[id], SpaceEvent::UserAdded(other)),
                    (true, false) => emit(sink, &[id], SpaceEvent::UserRemoved(&other.space_user_id)),
                    _ => {}
                }
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
    pub fn restart_connection(
        &mut self,
        requester: &str,
        peer: &str,
        connection_id: Option<&str>,
        sink: &mut impl SpaceSink,
    ) {
        let Some(conns) = &self.connections else { return };
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
        if self.connections.is_none() {
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
}
