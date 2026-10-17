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
    /// Open analytics intervals; None once the server stopped (they were ended then).
    timed: Option<crate::analytics::Timed>,
}

pub async fn run(parts: SessionParts, app: AppState) {
    let SessionParts {
        session,
        mut inbox,
        mut ended,
    } = parts;
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
        timed: Some(Default::default()),
    };
    let mut shutdown = app.shutdown.subscribe();
    loop {
        tokio::select! {
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
        app.sessions
            .remove_if(cid, |_, s| std::sync::Arc::ptr_eq(s, &session));
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

    /// The connection's analytics context, once the room has given the user an id.
    fn analytics(&self) -> Option<(std::sync::Arc<crate::analytics::Analytics>, crate::analytics::Context<'_>)> {
        let session = &self.parts_session;
        let a = self.app.analytics.clone()?;
        let space_user_id = session.space_user_id()?;
        Some((a, crate::analytics::Context { info: &session.info, user_id: session.user_id(), space_user_id }))
    }

    /// Opens the connection's session as soon as the user joined (the pusher does on roomJoined).
    fn analytics_connected(&mut self) {
        let Some(at) = self.parts_session.joined_at() else { return };
        let mut timed = self.timed.take();
        if let (Some(t), Some((a, ctx))) = (&mut timed, self.analytics()) {
            t.connected(&a, &ctx, at);
        }
        self.timed = timed;
    }

    fn end_intervals(&mut self, reason: &str) {
        self.analytics_connected();
        if let (Some(mut t), Some((a, ctx))) = (self.timed.take(), self.analytics()) {
            t.close_all(&a, &ctx, reason);
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
                    self.saved =
                        crate::player_variables::Mine::load(&self.app.redis, &session.info.user_uuid, &session.info.room_id).await;
                }
                let player_variables: Vec<pb::VariableMessage> = self
                    .saved
                    .saved
                    .iter()
                    .map(|(name, s)| pb::VariableMessage { name: name.clone(), value: s.value.clone() })
                    .collect();
                let public = self.saved.saved.iter().filter(|(_, s)| s.public).map(|(n, s)| (n.clone(), s.value.clone())).collect();
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
                self.to_room(RoomCmd::Join {
                    session: session.clone(),
                    request,
                    player_variables,
                })
                .await;
            }
            M::EditMapCommandMessage(command) => self.to_room(RoomCmd::Edit { session, command }).await,
            M::SetAreaPropertyVariableMessage(variable) => {
                self.to_room(RoomCmd::SetAreaVariable { session, variable }).await;
            }
            M::VariableMessage(v) => {
                self.to_room(RoomCmd::Variable {
                    session,
                    name: v.name,
                    value: v.value,
                })
                .await
            }
            M::FollowRequestMessage(m) => self.social(Social::FollowRequest(m)).await,
            M::FollowConfirmationMessage(m) => self.social(Social::FollowConfirmation(m)).await,
            M::FollowAbortMessage(m) => self.social(Social::FollowAbort(m)).await,
            M::LockGroupPromptMessage(m) => self.social(Social::LockGroup(m.lock)).await,
            M::EmotePromptMessage(m) => self.social(Social::Emote(m.emote)).await,
            M::ItemEventMessage(m) => self.social(Social::Item(m)).await,
            M::MeetingInvitationRequestMessage(m) => self.social(Social::InvitationRequest(m)).await,
            M::MeetingInvitationResponseMessage(m) => self.social(Social::InvitationResponse(m)).await,
            // handleBanPlayerMessage: admins only, silently ignored otherwise. Without an admin API a ban
            // cannot be stored: it falls back to a kick, as LocalAdmin's refusal does on the pusher.
            M::BanPlayerMessage(m) => {
                if !session.info.tags.iter().any(|t| t == "admin") {
                    return;
                }
                let (Some(admin), false) = (self.app.admin.clone(), m.kick) else {
                    self.social(Social::Kick { uuid: m.ban_user_uuid, reason: m.reason, banned: false }).await;
                    return;
                };
                // A7: stored by the admin, which refuses the user from then on (A3); kicked anyway if it fails.
                let Some(room) = self.room.clone() else { return };
                let app = self.app.clone();
                tokio::spawn(async move {
                    // byIp: the address the server sees for the user, unless the moderator shares it.
                    let ip = if m.by_ip {
                        let users = crate::room_actor::world_users(&app, &session.info.world).await.unwrap_or_default();
                        users.into_iter().find(|u| u.uuid == m.ban_user_uuid).map(|u| u.ip).filter(|ip| !ip.is_empty() && *ip != session.info.ip_address)
                    } else {
                        None
                    };
                    let message = if m.reason.is_empty() { format!("User banned by admin {}", session.info.user_uuid) } else { m.reason.clone() };
                    let banned = admin
                        .ban(&m.ban_user_uuid, &session.info.room_id, &m.ban_user_name, &message, &session.info.user_uuid, ip.as_deref())
                        .await
                        .unwrap_or(false);
                    let act = Social::Kick { uuid: m.ban_user_uuid, reason: m.reason, banned };
                    let _ = room.send(RoomCmd::Social { session, act }).await;
                });
            }
            // emitPlayGlobalMessage: admins only, to the room or to every room of the world.
            M::PlayGlobalMessage(m) => {
                if !session.info.tags.iter().any(|t| t == "admin") {
                    return;
                }
                let app = self.app.clone();
                tokio::spawn(async move {
                    let rooms = match (&app.admin, m.broadcast_to_world) {
                        (Some(admin), true) => match admin.rooms_from_same_world(&session.info.room_id, &[], true).await {
                            Ok(list) => list.as_array().into_iter().flatten().filter_map(|r| r["roomUrl"].as_str().map(str::to_owned)).collect(),
                            Err(e) => {
                                tracing::warn!(error = %e, "the admin did not list the rooms of the world");
                                return;
                            }
                        },
                        _ => vec![session.info.room_id.clone()],
                    };
                    for url in rooms {
                        let room = room_actor::get_or_spawn(&app, &url);
                        let _ = room.send(RoomCmd::AdminMessage { kind: m.r#type.clone(), message: m.content.clone() }).await;
                    }
                });
            }
            M::ReportPlayerMessage(m) => {
                if let Some(admin) = self.app.admin.clone() {
                    tokio::spawn(async move {
                        if let Err(e) = admin.report(&m.reported_user_uuid, &m.report_comment, &session.info.user_uuid, &session.info.room_id).await {
                            tracing::warn!(error = %e, "the admin did not take a report");
                        }
                    });
                }
            }
            M::UpdateChatIdMessage(m) => {
                self.chat_id = Some(m.chat_id.clone());
                if let Some(admin) = self.app.admin.clone() {
                    tokio::spawn(async move {
                        if let Err(e) = admin.update_chat_id(&m.email, &m.chat_id, &session.info.room_id).await {
                            tracing::warn!(error = %e, "the admin did not take a chat id");
                            session.push(wire::sub(pb::sub_message::Message::ErrorMessage(pb::ErrorMessage { message: e })));
                        }
                    });
                }
            }
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
                    let max = self.app.config.raw.get("PLAYER_VARIABLES_MAX_TTL").and_then(|t| t.parse().ok()).unwrap_or(-1);
                    let ttl = crate::player_variables::ttl(v.ttl, max);
                    self.saved.save(&self.app.redis, &v.name, &v.value, v.public, ttl);
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
                    let _ = space
                        .send(SpaceCmd::Leave {
                            session,
                            id,
                            query_id: None,
                        })
                        .await;
                }
            }
            M::AddSpaceFilterMessage(f) => {
                let (Some(f), Some(id)) = (f.space_filter_message, space_user_id) else { return };
                self.to_space(&f.space_name, SpaceCmd::Watch { id }).await;
            }
            M::RemoveSpaceFilterMessage(f) => {
                let (Some(f), Some(id)) = (f.space_filter_message, space_user_id) else { return };
                self.to_space(&f.space_name, SpaceCmd::Unwatch { id }).await;
            }
            M::UpdateSpaceUserMessage(update) => {
                let (Some(from), Some(id)) = (update.user, space_user_id) else { return };
                let paths: Vec<String> = update
                    .update_mask
                    .map(|m| m.paths)
                    .unwrap_or_default()
                    .into_iter()
                    .filter(|p| CLIENT_UPDATABLE.contains(&p.as_str()))
                    .collect();
                if paths.is_empty() {
                    return;
                }
                self.to_space(
                    &update.space_name,
                    SpaceCmd::Update {
                        id,
                        from: wire::space_user_update_from(&from),
                        paths,
                    },
                )
                .await;
            }
            M::UpdateSpaceMetadataMessage(m) => {
                let Some(id) = space_user_id else { return };
                let Ok(serde_json::Value::Object(map)) = serde_json::from_str::<serde_json::Value>(&m.metadata) else {
                    return;
                };
                let delta = map.into_iter().map(|(k, v)| (k, v.to_string())).collect();
                self.to_space(&m.space_name, SpaceCmd::Metadata { id, delta }).await;
            }
            M::PublicEvent(e) => {
                let (Some(event), Some(id)) = (e.space_event, space_user_id) else { return };
                self.to_space(&e.space_name, SpaceCmd::Public { id, event }).await;
            }
            M::PrivateEvent(e) => {
                let (Some(event), Some(id)) = (e.space_event, space_user_id) else { return };
                self.to_space(
                    &e.space_name,
                    SpaceCmd::Private {
                        id,
                        receiver: e.receiver_user_id,
                        event,
                    },
                )
                .await;
            }
            M::BackEvent(e) => {
                let Some(id) = space_user_id else { return };
                if let Some(pb::BackEvent {
                    event: Some(pb::back_event::Event::MeetingConnectionRestartMessage(r)),
                }) = e.back_event
                {
                    // LiveKit's restart carries no peer: the requester just gets a fresh invitation.
                    self.to_space(
                        &e.space_name,
                        SpaceCmd::Restart {
                            id,
                            peer: r.user_id,
                            connection_id: r.connection_id,
                        },
                    )
                    .await;
                }
            }
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
            M::AnalyticsEventReportMessage(report) => {
                let mut timed = self.timed.take();
                if let (Some(t), Some((a, ctx))) = (&mut timed, self.analytics()) {
                    t.report(&a, &ctx, report);
                }
                self.timed = timed;
            }
            M::VideoQualityReportMessage(report) => {
                if let Some((a, ctx)) = self.analytics() {
                    a.video_quality(&ctx, report, |space| self.spaces.contains_key(space));
                }
            }
            // J2 and later: emotes, variables, follow, lock, map editor, moderation, chat, analytics...
            _ => {}
        }
    }

    async fn query(&mut self, query: pb::QueryMessage) {
        use pb::answer_message::Answer as A;
        use pb::query_message::Query as Q;
        let session = self.parts_session.clone();
        let id = query.id;
        let Some(q) = query.query else {
            session.push(wire::answer_error(id, "Empty query"));
            return;
        };
        if let Some(admin) = self.app.admin.clone().filter(|a| crate::admin_queries::handles(&q, a)) {
            tokio::spawn(async move {
                session.push(match crate::admin_queries::answer(&admin, &session.info, q).await {
                    Ok(a) => wire::answer(id, a),
                    Err(e) => wire::answer_error(id, e),
                });
            });
            return;
        }
        if let Q::BanIpPreviewQuery(preview) = q {
            let app = self.app.clone();
            tokio::spawn(async move {
                let info = &session.info;
                if !info.tags.iter().any(|t| t == "admin") {
                    session.push(wire::answer_error(id, "Only an admin of the world can preview a ban"));
                    return;
                }
                let Some(users) = crate::room_actor::world_users(&app, &info.world).await else {
                    session.push(wire::answer_error(id, "A room did not answer"));
                    return;
                };
                let ip = users.iter().find(|u| u.uuid == preview.ban_user_uuid).map(|u| u.ip.clone()).filter(|ip| !ip.is_empty());
                let answer = match ip {
                    None => pb::BanIpPreviewAnswer { ip_known: false, includes_moderator: false, users: vec![] },
                    Some(ip) => pb::BanIpPreviewAnswer {
                        ip_known: true,
                        includes_moderator: ip == info.ip_address,
                        users: users
                            .into_iter()
                            .filter(|u| u.ip == ip && u.uuid != preview.ban_user_uuid && u.uuid != info.user_uuid)
                            .map(|u| pb::BanIpPreviewUser { name: u.name })
                            .collect(),
                    },
                };
                session.push(wire::answer(id, A::BanIpPreviewAnswer(answer)));
            });
            return;
        }
        let answer = match q {
            Q::IceServersQuery(_) => match session.user_id() {
                Some(user) => A::IceServersAnswer(pb::IceServersAnswer {
                    ice_servers: local_admin::ice_servers(&self.app.config, user),
                }),
                None => {
                    session.push(wire::answer_error(id, "Not joined yet"));
                    return;
                }
            },
            Q::JoinSpaceQuery(join) => {
                let Some(space_user_id) = session.space_user_id() else {
                    session.push(wire::answer_error(id, "Space user id not found"));
                    return;
                };
                let filter = match join.filter_type {
                    0 => FilterType::AllUsers,
                    1 => FilterType::LiveStreamingUsers,
                    2 => FilterType::LiveStreamingUsersWithFeedback,
                    _ => {
                        session.push(wire::answer_error(id, "Unknown filter type"));
                        return;
                    }
                };
                let space = space_actor::get_or_spawn(&self.app, &self.world_key(&join.space_name), &join.space_name);
                let user = self.space_user(space_user_id);
                // The space answers, then sends what follows the answer.
                let _ = space
                    .send(SpaceCmd::Join {
                        session,
                        user,
                        filter,
                        properties_to_sync: join.properties_to_sync,
                        query_id: id,
                    })
                    .await;
                self.recent_joins.retain(|_, (_, at)| at.elapsed() < ABORT_WINDOW);
                self.recent_joins.insert(id, (join.space_name.clone(), Instant::now()));
                self.spaces.insert(join.space_name, space);
                return;
            }
            Q::LeaveSpaceQuery(leave) => {
                if let (Some(space), Some(user)) = (self.spaces.remove(&leave.space_name), session.space_user_id()) {
                    let _ = space
                        .send(SpaceCmd::Leave {
                            session,
                            id: user,
                            query_id: Some(id),
                        })
                        .await;
                    return;
                }
                A::LeaveSpaceAnswer(pb::LeaveSpaceAnswer {})
            }
            Q::SpaceStateQuery(state) => {
                use pb::space_state_query::Query as S;
                let recording = matches!(
                    state.query.as_ref().and_then(|q| q.query.as_ref()),
                    Some(S::StartRecording(_) | S::StopRecording(_))
                );
                if recording && !session.info.can_record {
                    session.push(wire::answer_error(id, "You are not allowed to record"));
                    return;
                }
                if let (Some(space), Some(user)) = (self.spaces.get(&state.space_name), session.space_user_id()) {
                    let _ = space
                        .send(SpaceCmd::StateQuery {
                            session,
                            id: user,
                            query_id: id,
                            query: state.query.and_then(|q| q.query),
                        })
                        .await;
                    return;
                }
                session.push(wire::answer_error(id, "You are not part of this space"));
                return;
            }
            Q::SendEventQuery(e) => {
                self.to_room(RoomCmd::Event {
                    sender: session.user_id(),
                    name: e.name,
                    data: e.data,
                    targets: e.target_user_ids,
                })
                .await;
                A::SendEventAnswer(pb::SendEventAnswer {})
            }
            Q::RoomTagsQuery(_) => A::RoomTagsAnswer(pb::RoomTagsAnswer::default()),
            Q::SearchTagsQuery(_) => A::SearchTagsAnswer(pb::SearchTagsAnswer::default()),
            Q::ChatMembersQuery(_) => A::ChatMembersAnswer(pb::ChatMembersAnswer::default()),
            Q::GetRecordingsQuery(_)
            | Q::GetRecordingThumbnailsQuery(_)
            | Q::DeleteRecordingQuery(_)
            | Q::GetSignedUrlQuery(_) => {
                // S3 calls: off the message loop, the answer pushed when it comes.
                let (app, session, uuid) = (self.app.clone(), session.clone(), session.info.user_uuid.clone());
                tokio::spawn(async move {
                    let bucket = crate::s3::Bucket::from_config(&app.config);
                    let answer: Result<A, String> = match (q, bucket) {
                        (Q::GetRecordingsQuery(_), Some(b)) => crate::recordings::list(&b, &app.http, &uuid)
                            .await
                            .map(|recordings| A::GetRecordingsAnswer(pb::GetRecordingsAnswer { recordings })),
                        (Q::GetRecordingThumbnailsQuery(t), Some(b)) => crate::recordings::thumbnails(&b, &app.http, &uuid, &t.base_filename)
                            .await
                            .map(|urls| A::GetRecordingThumbnailsAnswer(pb::GetRecordingThumbnailsAnswer { urls })),
                        (Q::DeleteRecordingQuery(d), Some(b)) => {
                            let success = crate::recordings::delete(&b, &app.http, &uuid, &d.recording_id).await;
                            Ok(A::DeleteRecordingAnswer(pb::DeleteRecordingAnswer { success, error_message: None }))
                        }
                        (Q::GetSignedUrlQuery(g), Some(b)) => crate::recordings::signed_url(&b, &uuid, &g.key)
                            .map(|signed_url| A::GetSignedUrlAnswer(pb::GetSignedUrlAnswer { signed_url })),
                        // No bucket: empty lists, as the pusher answers.
                        (Q::GetRecordingsQuery(_), None) => Ok(A::GetRecordingsAnswer(pb::GetRecordingsAnswer::default())),
                        (Q::GetRecordingThumbnailsQuery(_), None) => Ok(A::GetRecordingThumbnailsAnswer(pb::GetRecordingThumbnailsAnswer::default())),
                        (Q::DeleteRecordingQuery(_), None) => Ok(A::DeleteRecordingAnswer(pb::DeleteRecordingAnswer { success: false, error_message: None })),
                        _ => Err("Recording storage is not configured".into()),
                    };
                    session.push(match answer {
                        Ok(a) => wire::answer(id, a),
                        Err(e) => {
                            tracing::warn!(error = %e, "recording query failed");
                            wire::answer_error(id, e)
                        }
                    });
                });
                return;
            }
            // Asking the site takes up to 5 s: not on this session's message loop.
            Q::EmbeddableWebsiteQuery(q) => {
                let (http, config) = (self.app.http.clone(), self.app.config.clone());
                tokio::spawn(async move {
                    let whitelist = config.raw.get("EMBEDDED_DOMAINS_WHITELIST").cloned().unwrap_or_default();
                    let answer = crate::embed::check(&http, q.url, &whitelist, &config.front_url).await;
                    session.push(wire::answer(id, A::EmbeddableWebsiteAnswer(answer)));
                });
                return;
            }
            // LocalAdmin.getUrlRoomsFromSameWorld: the maps of the map-storage, for a map-storage room.
            Q::RoomsFromSameWorldQuery(_) => {
                if crate::local_admin::wam_path(&self.parts_session.info.room_id).is_none() {
                    session.push(wire::answer_error(id, "No admin backoffice set!"));
                    return;
                }
                let base = self.app.config.raw.get("PUBLIC_MAP_STORAGE_URL").cloned().unwrap_or_default();
                let base = base.trim_end_matches('/');
                let text = |v: &serde_json::Value| v.as_str().map(str::to_owned);
                let rooms = self.app.storage.wam_list().await.into_iter().map(|(path, entry)| {
                    let m = &entry["metadata"];
                    pb::RoomShortDescription {
                        name: text(&m["name"]).unwrap_or_else(|| path.clone()),
                        room_url: format!("/~/{path}"),
                        wam_url: Some(format!("{base}/{path}")),
                        description: text(&m["description"]),
                        copyright: text(&m["copyright"]),
                        thumbnail: text(&m["thumbnail"]),
                        areas_searchable: m["areasSearchable"].as_i64().map(|n| n as i32),
                        entities_searchable: m["entitiesSearchable"].as_i64().map(|n| n as i32),
                    }
                });
                A::RoomsFromSameWorldAnswer(pb::RoomsFromSameWorldAnswer {
                    room_descriptions: rooms.collect(),
                })
            }
            // The token map-storage asks for a private file (pusher handleMapStorageJwtQuery): valid 1 h.
            Q::MapStorageJwtQuery(_) => {
                let info = &self.parts_session.info;
                let wam_url = match &self.app.admin {
                    // The admin's map details (A2); empty for a redirection or an error.
                    Some(admin) => admin.map_details(&info.room_id, None, None).await["wamUrl"].as_str().unwrap_or_default().to_owned(),
                    None => {
                        let base = self.app.config.raw.get("PUBLIC_MAP_STORAGE_URL").cloned().unwrap_or_default();
                        crate::local_admin::wam_path(&info.room_id).map_or_else(String::new, |rest| format!("{base}/{rest}"))
                    }
                };
                let claims = serde_json::json!({"wamUrl": wam_url, "tags": info.tags, "exp": crate::jwt::now_secs() + 3600});
                A::MapStorageJwtAnswer(pb::MapStorageJwtAnswer {
                    jwt: crate::jwt::sign(&self.app.config.secret_key, &claims),
                })
            }
            Q::GetMemberQuery(_) => {
                session.push(wire::answer_error(id, "User not found, probably left"));
                return;
            }
            _ => {
                session.push(wire::answer_error(id, "Not supported by this server yet"));
                return;
            }
        };
        session.push(wire::answer(id, answer));
    }

    async fn cleanup(&mut self) {
        let session = self.parts_session.clone();
        self.to_room(RoomCmd::Leave {
            session: session.clone(),
        })
        .await;
        if let Some(id) = session.space_user_id() {
            for (_, space) in self.spaces.drain() {
                let _ = space
                    .send(SpaceCmd::Leave {
                        session: session.clone(),
                        id: id.clone(),
                        query_id: None,
                    })
                    .await;
            }
        }
        self.room = None;
    }
}
