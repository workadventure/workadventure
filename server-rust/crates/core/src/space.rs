//! A space: a set of players sharing presence, events and, for media spaces, peer-to-peer audio/video.
//!
//! Merges the pusher's Space/SpaceToFrontDispatcher and the back's Space/CommunicationManager with its
//! WebRTC strategy. LiveKit is not handled yet: a media space stays in peer-to-peer mode, which is also what
//! the reference does when no LiveKit is configured.

use std::collections::{BTreeMap, HashMap, HashSet};

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
    /// Every visible member, to a new watcher.
    InitUsers(Vec<&'a SpaceUser>, &'a BTreeMap<String, String>),
    /// The whole state, as a root replace.
    StateReplace(Option<&'a str>),
    KindChanged(&'a str),
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
    kind: Option<String>,
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
            kind: None,
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

    pub fn kind(&self) -> Option<&str> {
        self.kind.as_deref()
    }

    fn visible(&self, u: &SpaceUser) -> bool {
        match self.filter {
            FilterType::AllUsers => true,
            FilterType::LiveStreamingUsers => u.megaphone_state,
            FilterType::LiveStreamingUsersWithFeedback => u.megaphone_state || u.attendees_state,
        }
    }

    fn watcher_list(&self) -> Vec<&str> {
        self.watchers.iter().map(String::as_str).collect()
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
        if self.visible(user) {
            emit(sink, &self.watcher_list(), SpaceEvent::UserAdded(user));
        }
        Ok(())
    }

    /// What a joiner gets once its join was answered: the state, then the communication strategy.
    pub fn after_join(&self, id: &str, sink: &mut impl SpaceSink) {
        let Some(user) = self.member(id) else { return };
        emit(sink, &[id], SpaceEvent::StateReplace(self.kind()));
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
        let users: Vec<&SpaceUser> = self.members.iter().filter(|u| self.visible(u)).collect();
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
        if self.visible(&user) {
            emit(sink, &self.watcher_list(), SpaceEvent::UserRemoved(id));
        }
        if let Some(c) = &mut self.connections {
            c.retain(|(a, b), _| a != id && b != id);
        }
    }

    /// A client-side update (updateSpaceUserMessage). Fields outside CLIENT_UPDATABLE are ignored.
    pub fn update_from_client(&mut self, id: &str, from: &SpaceUser, paths: &[String], sink: &mut impl SpaceSink) {
        let Some(user) = self.member(id) else { return };
        let was_visible = self.visible(user);
        let applied = self.member_mut(id).expect("checked above").apply_client_update(from, paths);
        if !applied.is_empty() {
            self.notify_updated(id, was_visible, &applied, sink);
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
        let Some(user) = self.member_mut(id) else { return };
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
            let visible = self.member(id).is_some_and(|u| self.visible(u));
            self.notify_updated(id, visible, &paths, sink);
        }
    }

    fn notify_updated(&self, id: &str, was_visible: bool, paths: &[String], sink: &mut impl SpaceSink) {
        let user = self.member(id).expect("checked by the caller");
        let to = self.watcher_list();
        match (was_visible, self.visible(user)) {
            (true, true) => emit(sink, &to, SpaceEvent::UserUpdated(user, paths)),
            (false, true) => emit(sink, &to, SpaceEvent::UserAdded(user)),
            (true, false) => emit(sink, &to, SpaceEvent::UserRemoved(id)),
            (false, false) => {}
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

    pub fn set_kind(&mut self, kind: &str, sink: &mut impl SpaceSink) {
        if self.kind.as_deref() == Some(kind) {
            return;
        }
        self.kind = Some(kind.to_owned());
        let to: Vec<&str> = self.member_ids().collect();
        emit(sink, &to, SpaceEvent::KindChanged(kind));
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
