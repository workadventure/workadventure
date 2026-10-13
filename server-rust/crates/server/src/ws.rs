//! `GET /ws/room`: the WebSocket upgrade (IoSocketController + PusherRoomSocketController).
//!
//! A refused connection is still upgraded: it gets one message explaining why, then a normal close, which is
//! what the front expects.

use axum::extract::ws::WebSocketUpgrade;
use axum::extract::{RawQuery, State};
use axum::http::{HeaderMap, header};
use axum::response::Response;
use wa_proto::messages as pb;

use crate::AppState;
use crate::front::query_pairs;
use crate::jwt;
use crate::local_admin;
use crate::logic;
use crate::session::{self, Session, SessionInfo};

const MAX_MESSAGE: usize = 16 * 1024 * 1024;

enum Upgrade {
    Fresh(Box<SessionInfo>),
    Resume(std::sync::Arc<Session>, u32),
    Reject(Box<pb::server_to_client_message::Message>),
    Refuse(u16, &'static str),
}

fn error_screen(r#type: &str, code: &str, title: &str, subtitle: &str, details: String) -> pb::server_to_client_message::Message {
    pb::server_to_client_message::Message::ErrorScreenMessage(pb::ErrorScreenMessage {
        r#type: r#type.into(),
        code: Some(code.into()),
        title: Some(title.into()),
        subtitle: Some(subtitle.into()),
        details: Some(details),
        image: Some(String::new()),
        ..pb::ErrorScreenMessage::default()
    })
}

fn internal_error(details: &str) -> Upgrade {
    Upgrade::Reject(Box::new(error_screen(
        "error",
        "internal_error",
        "500 Internal Server Error",
        "Something wrong happened while connecting!",
        details.into(),
    )))
}

fn prepare(state: &AppState, query: Option<&str>, token: &str, headers: &HeaderMap) -> Upgrade {
    use pb::server_to_client_message::Message as M;
    let pairs = query_pairs(query);
    let get = |k: &str| pairs.iter().find(|(key, _)| key == k).map(|(_, v)| v.clone());

    let missing: Vec<String> = ["roomId", "version", "chatID", "roomName", "cameraState", "microphoneState", "tabId"]
        .into_iter()
        .filter(|k| get(k).is_none() || (*k == "tabId" && get(k).as_deref() == Some("")))
        .map(|k| format!("Parameter {k}: Required"))
        .collect();
    if !missing.is_empty() {
        return Upgrade::Reject(Box::new(error_screen(
            "error",
            "WS_BAD_REQUEST",
            "400 Bad Request",
            "Something wrong happened while connecting!",
            missing.join("\n"),
        )));
    }
    let room_id = get("roomId").unwrap_or_default();
    let connection_id = get("connectionId").filter(|c| !c.is_empty());

    // A transport resume: only onto a session that is still there, for the same token and room.
    if let Some(raw) = get("lastReceivedNonce").filter(|v| !v.is_empty()) {
        let Ok(last) = raw.parse::<u32>() else {
            return internal_error(&format!("Parameter lastReceivedNonce: Expected nonnegative integer, received {raw}"));
        };
        let retained = connection_id.as_ref().and_then(|c| state.sessions.get(c).map(|s| s.clone()));
        return match retained {
            Some(s) if !s.is_ended() && s.info.token == token && s.info.room_id == room_id => Upgrade::Resume(s, last),
            _ => Upgrade::Refuse(1008, "Cannot replace socket: previous connection not retained"),
        };
    }

    let version = get("version").unwrap_or_default();
    if let Some(expected) = state.front.api_version()
        && expected != version
    {
        return Upgrade::Reject(Box::new(M::ErrorScreenMessage(pb::ErrorScreenMessage {
            r#type: "retry".into(),
            code: Some("NEW_VERSION".into()),
            title: Some("Please refresh".into()),
            subtitle: Some("New version available".into()),
            details: Some("A new version of WorkAdventure is available. Please refresh your window".into()),
            image: Some("/resources/icons/new_version.png".into()),
            image_logo: Some("/static/images/logo.png".into()),
            can_retry_manual: Some(true),
            button_title: Some("Refresh".into()),
            time_to_retry: Some(999_999),
            url_to_redirect: None,
        })));
    }

    let claims = if token.is_empty() {
        if state.config.disable_anonymous {
            return internal_error("Expecting token");
        }
        jwt::Claims::default()
    } else {
        match jwt::verify(&state.config.secret_key, token) {
            Ok(c) => c,
            Err(_) => return Upgrade::Reject(Box::new(M::TokenExpiredMessage(pb::TokenExpiredMessage {}))),
        }
    };

    let texture_ids: Vec<String> = pairs
        .iter()
        .filter(|(k, _)| k == "characterTextureIds")
        .map(|(_, v)| v.clone())
        .collect();
    let Some(textures) = local_admin::resolve_textures(&texture_ids) else {
        return Upgrade::Reject(Box::new(M::InvalidCharacterTextureMessage(pb::InvalidCharacterTextureMessage {
            message: "Invalid character textures".into(),
        })));
    };
    let companion = match get("companionTextureId").filter(|c| !c.is_empty()) {
        None => None,
        Some(id) => match local_admin::resolve_companion(&id) {
            Some(t) => Some(t),
            None => {
                return Upgrade::Reject(Box::new(M::InvalidCompanionTextureMessage(pb::InvalidCompanionTextureMessage {
                    message: "Invalid companion texture".into(),
                })));
            }
        },
    };
    let Some(world) = local_admin::world_of(&room_id) else {
        return internal_error("User cannot access this world");
    };
    let tags = claims.tags.clone().unwrap_or_default();
    let ip_address = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split(',').next())
        .map(|v| v.trim().to_owned())
        .unwrap_or_default();
    Upgrade::Fresh(Box::new(SessionInfo {
        can_edit: local_admin::can_edit(&state.config, &room_id, &claims.identifier, &tags),
        room_id,
        world,
        token: token.to_owned(),
        user_uuid: claims.identifier.clone(),
        is_logged: claims.access_token.is_some(),
        ip_address,
        tags,
        textures,
        companion,
        visit_card_url: None,
        chat_id: get("chatID").filter(|c| !c.is_empty()),
        room_name: get("roomName").filter(|r| !r.is_empty()),
        tab_id: get("tabId").unwrap_or_default(),
        connection_id,
    }))
}

pub async fn ws_room(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    headers: HeaderMap,
    RawQuery(query): RawQuery,
) -> Response {
    // The token travels as the sub-protocol and must be echoed, or the browser fails the handshake.
    let token = headers
        .get(header::SEC_WEBSOCKET_PROTOCOL)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_owned();
    let mut ws = ws.max_message_size(MAX_MESSAGE).max_frame_size(MAX_MESSAGE);
    if !token.is_empty() {
        ws = ws.protocols([token.clone()]);
    }
    match prepare(&state, query.as_deref(), &token, &headers) {
        Upgrade::Fresh(info) => ws.on_upgrade(move |socket| async move {
            let parts = Session::start(*info, socket, state.config.client_disconnection_retention);
            logic::run(parts, state).await;
        }),
        Upgrade::Resume(session, last) => ws.on_upgrade(move |socket| async move {
            if !session.resume(socket, last).await {
                tracing::info!(user = %session.info.user_uuid, "transport resume refused");
            }
        }),
        Upgrade::Reject(message) => ws.on_upgrade(move |socket| session::reject(socket, *message)),
        Upgrade::Refuse(code, reason) => ws.on_upgrade(move |socket| session::refuse(socket, code, reason)),
    }
}
