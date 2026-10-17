//! What a session does with the client messages (IoSocketController's message handler), one at a time and in
//! order. Room and space work is sent to their owner tasks; nothing here waits for them to answer.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use wa_core::geometry::Viewport;
use wa_core::room::JoinRequest;
use wa_core::space::{CLIENT_UPDATABLE, FilterType, SpaceUser};
use wa_core::user::{Availability, Profile};
use wa_proto::messages as pb;

use crate::AppState;
use crate::local_admin;
use crate::room_actor::{self, RoomCmd, RoomHandle, Social};
use crate::session::SessionParts;
use crate::space_actor::{self, SpaceCmd, SpaceHandle};
use crate::wire;

mod analytics;
mod moderation;
mod queries;
mod spaces;

/// An abort that arrives this soon after a join was answered undoes the join (the front never sends a
/// leave for a join it gave up on).
const ABORT_WINDOW: Duration = Duration::from_secs(5);

struct Logic {
    parts_session: std::sync::Arc<crate::session::Session>,
    app: AppState,
    room: Option<RoomHandle>,
    joined: bool,
    name: String,
    availability: Availability,
    chat_id: Option<String>,
    /// Joined spaces, by the name the front uses.
    spaces: HashMap<String, SpaceHandle>,
    recent_joins: HashMap<i32, (String, Instant)>,
    /// A logged player's saved variables in this room.
    saved: crate::player_variables::Mine,
    /// The same in the room's world, when the room has one.
    saved_world: Option<crate::player_variables::Mine>,
    /// Open analytics intervals; None once the server stopped (they were ended then).
    timed: Option<crate::analytics::Timed>,
}

pub async fn run(parts: SessionParts, app: AppState) {
    let SessionParts { session, mut inbox, mut ended } = parts;
    if let Some(cid) = &session.info.connection_id {
        app.sessions.insert(cid.clone(), session.clone());
    }
    // Like the back on connect: the room (and its map) exists from now on, and says it is ready.
    let room = room_actor::get_or_spawn(&app, &session.info.room_id);
    let _ = room.send(RoomCmd::Connect { session: session.clone() }).await;
    let mut logic = Logic {
        chat_id: session.info.chat_id.clone(),
        parts_session: session.clone(),
        app: app.clone(),
        room: Some(room),
        joined: false,
        name: String::new(),
        availability: Availability::ONLINE,
        spaces: HashMap::new(),
        recent_joins: HashMap::new(),
        saved: Default::default(),
        saved_world: None,
        timed: Some(Default::default()),
    };
    let mut shutdown = app.shutdown.subscribe();
    loop {
        tokio::select! {
            // What the client sent before it went away is handled first, in order, as the pusher does.
            biased;
            message = inbox.recv() => match message {
                Some(m) => logic.handle(m).await,
                None => break,
            },
            _ = ended.changed() => break,
            Ok(()) = shutdown.changed(), if logic.timed.is_some() => logic.end_intervals("pusher_shutdown"),
        }
    }
    logic.end_intervals("socket_closed");
    logic.cleanup().await;
    if let Some(cid) = &session.info.connection_id {
        app.sessions.remove_if(cid, |_, s| std::sync::Arc::ptr_eq(s, &session));
    }
}

impl Logic {
    fn world_key(&self, local: &str) -> String {
        format!("{}.{}", self.parts_session.info.world, local)
    }

    async fn social(&self, act: Social) {
        self.to_room(RoomCmd::Social { session: self.parts_session.clone(), act }).await;
    }

    async fn to_room(&self, cmd: RoomCmd) {
        if let Some(room) = &self.room {
            let _ = room.send(cmd).await;
        }
    }

    async fn to_space(&self, local: &str, cmd: SpaceCmd) {
        if let Some(space) = self.spaces.get(local) {
            let _ = space.send(cmd).await;
        }
    }

    fn space_user(&self, id: String) -> SpaceUser {
        let info = &self.parts_session.info;
        SpaceUser {
            space_user_id: id,
            name: self.name.clone(),
            play_uri: info.room_id.clone(),
            color: wire::color_of(&self.name),
            textures: info.textures.clone(),
            is_logged: info.is_logged,
            availability: self.availability,
            room_name: info.room_name.clone(),
            visit_card_url: info.visit_card_url.clone(),
            tags: info.tags.clone(),
            uuid: info.user_uuid.clone(),
            chat_id: self.chat_id.clone(),
            ..SpaceUser::default()
        }
    }

    async fn handle(&mut self, message: pb::ClientToServerMessage) {
        use pb::client_to_server_message::Message as M;
        if let Some(t) = &mut self.timed {
            t.last_activity_ms = crate::redis_store::now_ms();
        }
        self.analytics_connected();
        let session = self.parts_session.clone();
        let user = session.user_id();
        let space_user_id = session.space_user_id();
        let Some(message) = message.message else { return };
        match message {
            M::JoinRoomFrontMessage(join) => {
                if self.joined {
                    return;
                }
                let (Some(position), Some(viewport)) = (join.position_message, join.viewport_message) else {
                    session.end();
                    return;
                };
                self.name = join.name;
                self.availability = Availability(join.availability_status);
                // The back loads them when the user is created, before roomJoinedMessage.
                if session.info.is_logged {
                    use crate::player_variables::{Mine, key, world_key};
                    let uuid = &session.info.user_uuid;
                    self.saved = Mine::load(&self.app.redis, key(uuid, &session.info.room_id)).await;
                    let (tx, rx) = tokio::sync::oneshot::channel();
                    self.to_room(RoomCmd::Group(tx)).await;
                    if let Ok(Some(group)) = rx.await {
                        self.saved_world = Some(Mine::load(&self.app.redis, world_key(uuid, &group)).await);
                    }
                }
                // The world's first, the room's over them (getVariables).
                let mut all: Vec<(String, crate::player_variables::Saved)> = Vec::new();
                for (name, s) in self.saved_world.iter().flat_map(|w| &w.saved).chain(&self.saved.saved) {
                    all.retain(|(n, _)| n != name);
                    all.push((name.clone(), s.clone()));
                }
                let player_variables: Vec<pb::VariableMessage> = all
                    .iter()
                    .map(|(name, s)| pb::VariableMessage { name: name.clone(), value: s.value.clone() })
                    .collect();
                let public = all.iter().filter(|(_, s)| s.public).map(|(n, s)| (n.clone(), s.value.clone())).collect();
                let info = &session.info;
                let request = JoinRequest {
                    profile: Profile {
                        uuid: info.user_uuid.clone(),
                        name: self.name.clone(),
                        textures: info.textures.clone(),
                        companion: info.companion.clone(),
                        visit_card_url: info.visit_card_url.clone(),
                        tags: info.tags.clone(),
                        is_logged: info.is_logged,
                        can_edit: info.can_edit,
                        ip_address: info.ip_address.clone(),
                        tab_id: Some(info.tab_id.clone()),
                    },
                    position: wire::position_from(&position),
                    availability: self.availability,
                    viewport: wire::viewport_from(&viewport),
                    variables: public,
                };
                self.joined = true;
                self.to_room(RoomCmd::Join { session: session.clone(), request, player_variables }).await;
            }
            M::EditMapCommandMessage(command) => self.to_room(RoomCmd::Edit { session, command }).await,
            M::SetAreaPropertyVariableMessage(variable) => {
                self.to_room(RoomCmd::SetAreaVariable { session, variable }).await;
            }
            M::VariableMessage(v) => self.to_room(RoomCmd::Variable { session, name: v.name, value: v.value }).await,
            M::FollowRequestMessage(m) => self.social(Social::FollowRequest(m)).await,
            M::FollowConfirmationMessage(m) => self.social(Social::FollowConfirmation(m)).await,
            M::FollowAbortMessage(m) => self.social(Social::FollowAbort(m)).await,
            M::LockGroupPromptMessage(m) => self.social(Social::LockGroup(m.lock)).await,
            M::EmotePromptMessage(m) => self.social(Social::Emote(m.emote)).await,
            M::ItemEventMessage(m) => self.social(Social::Item(m)).await,
            M::MeetingInvitationRequestMessage(m) => self.social(Social::InvitationRequest(m)).await,
            M::MeetingInvitationResponseMessage(m) => self.social(Social::InvitationResponse(m)).await,
            m @ (M::BanPlayerMessage(_)
            | M::PlayGlobalMessage(_)
            | M::ReportPlayerMessage(_)
            | M::UpdateChatIdMessage(_)) => self.moderation(m).await,
            M::UserMovesMessage(moves) => {
                let (Some(user), Some(position)) = (user, moves.position) else { return };
                self.to_room(RoomCmd::Move {
                    user,
                    position: wire::position_from(&position),
                    viewport: moves.viewport.as_ref().map(wire::viewport_from),
                })
                .await;
            }
            M::ViewportMessage(v) => {
                let Some(user) = user else { return };
                let viewport: Viewport = wire::viewport_from(&v);
                self.to_room(RoomCmd::Viewport { user, viewport }).await;
            }
            M::SetPlayerDetailsMessage(details) => {
                let Some(user) = user else { return };
                let change = wire::details_from(&details);
                if change.availability != Availability::UNCHANGED {
                    self.availability = change.availability;
                }
                if let Some(chat_id) = &change.chat_id {
                    self.chat_id = Some(chat_id.clone());
                }
                if let Some(v) = &change.variable
                    && v.persist
                    && session.info.is_logged
                {
                    let max =
                        self.app.config.raw.get("PLAYER_VARIABLES_MAX_TTL").and_then(|t| t.parse().ok()).unwrap_or(-1);
                    let ttl = crate::player_variables::ttl(v.ttl, max);
                    let world = pb::set_player_variable_message::Scope::World as i32;
                    let store = match &mut self.saved_world {
                        Some(w) if v.scope == world => w,
                        _ => &mut self.saved,
                    };
                    store.save(&self.app.redis, &v.name, &v.value, v.public, ttl);
                }
                if let Some(id) = &space_user_id {
                    for space in self.spaces.values() {
                        let _ = space
                            .send(SpaceCmd::Details {
                                id: id.clone(),
                                availability: change.availability,
                                chat_id: change.chat_id.clone(),
                                show_voice_indicator: change.show_voice_indicator,
                            })
                            .await;
                    }
                }
                self.to_room(RoomCmd::Details { user, change }).await;
            }
            M::QueryMessage(query) => self.query(query).await,
            M::AbortQueryMessage(abort) => {
                if let Some((local, at)) = self.recent_joins.remove(&abort.id)
                    && at.elapsed() < ABORT_WINDOW
                    && let (Some(space), Some(id)) = (self.spaces.remove(&local), space_user_id)
                {
                    let _ = space.send(SpaceCmd::Leave { session, id, query_id: None }).await;
                }
            }
            m @ (M::AddSpaceFilterMessage(_)
            | M::RemoveSpaceFilterMessage(_)
            | M::UpdateSpaceUserMessage(_)
            | M::UpdateSpaceMetadataMessage(_)
            | M::PublicEvent(_)
            | M::PrivateEvent(_)
            | M::BackEvent(_)) => self.space_message(m).await,
            M::AskPositionMessage(ask) => {
                let Some(user) = user else { return };
                self.to_room(RoomCmd::AskPosition {
                    user,
                    target_uuid: ask.user_identifier,
                    target_id: ask.user_id,
                    locate: ask.ask_type == pb::ask_position_message::AskType::Locate as i32,
                })
                .await;
            }
            // Any client frame is a pong.
            M::PingMessage(_) => {}
            m @ (M::AnalyticsEventReportMessage(_) | M::VideoQualityReportMessage(_)) => self.analytics_message(m),
            // J2 and later: emotes, variables, follow, lock, map editor, moderation, chat, analytics...
            _ => {}
        }
    }

    async fn cleanup(&mut self) {
        let session = self.parts_session.clone();
        self.to_room(RoomCmd::Leave { session: session.clone() }).await;
        if let Some(id) = session.space_user_id() {
            for (_, space) in self.spaces.drain() {
                let _ = space.send(SpaceCmd::Leave { session: session.clone(), id: id.clone(), query_id: None }).await;
            }
        }
        self.room = None;
    }
}
