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
use crate::room_actor::{self, RoomCmd, RoomHandle};
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
    let room = room_actor::get_or_spawn(&app.rooms, &session.info.room_id, app.room_config, &app.storage);
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
    };
    loop {
        tokio::select! {
            message = inbox.recv() => match message {
                Some(m) => logic.handle(m).await,
                None => break,
            },
            _ = ended.changed() => break,
        }
    }
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
                };
                self.joined = true;
                self.to_room(RoomCmd::Join {
                    session: session.clone(),
                    request,
                })
                .await;
            }
            M::EditMapCommandMessage(command) => self.to_room(RoomCmd::Edit { session, command }).await,
            M::SetAreaPropertyVariableMessage(variable) => {
                self.to_room(RoomCmd::SetAreaVariable { session, variable }).await;
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
                    && let Some(peer) = r.user_id
                {
                    self.to_space(
                        &e.space_name,
                        SpaceCmd::Restart {
                            id,
                            peer,
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
                let space = space_actor::get_or_spawn(&self.app.spaces, &self.world_key(&join.space_name), &join.space_name);
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
            Q::RoomTagsQuery(_) => A::RoomTagsAnswer(pb::RoomTagsAnswer::default()),
            Q::SearchTagsQuery(_) => A::SearchTagsAnswer(pb::SearchTagsAnswer::default()),
            Q::ChatMembersQuery(_) => A::ChatMembersAnswer(pb::ChatMembersAnswer::default()),
            Q::GetRecordingsQuery(_) => A::GetRecordingsAnswer(pb::GetRecordingsAnswer::default()),
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
                let base = self.app.config.raw.get("PUBLIC_MAP_STORAGE_URL").cloned().unwrap_or_default();
                let wam_url = crate::local_admin::wam_path(&info.room_id).map_or_else(String::new, |rest| format!("{base}/{rest}"));
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
