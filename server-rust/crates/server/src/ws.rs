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

fn error_screen(
    r#type: &str,
    code: &str,
    title: &str,
    subtitle: &str,
    details: String,
) -> pb::server_to_client_message::Message {
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

/// toErrorScreenMessage: an ErrorApiData of the admin as the front's error screen.
fn admin_error_screen(e: &serde_json::Value) -> pb::server_to_client_message::Message {
    let s = |k: &str| e[k].as_str().map(str::to_owned);
    let kind = s("type").unwrap_or_else(|| "error".into());
    let mut m = pb::ErrorScreenMessage { r#type: kind.clone(), ..pb::ErrorScreenMessage::default() };
    if ["retry", "error", "unauthorized"].contains(&kind.as_str()) {
        (m.code, m.title, m.subtitle, m.details) = (s("code"), s("title"), s("subtitle"), s("details"));
        (m.image, m.image_logo) = (s("image"), s("imageLogo"));
        if kind != "error" {
            m.button_title = s("buttonTitle");
        }
    }
    if kind == "retry" {
        m.can_retry_manual = e["canRetryManual"].as_bool();
        m.time_to_retry = e["timeToRetry"].as_i64().map(|t| t as i32);
    }
    if kind == "redirect" {
        m.url_to_redirect = s("urlToRedirect");
    }
    pb::server_to_client_message::Message::ErrorScreenMessage(m)
}

fn texture_of(v: &serde_json::Value) -> Option<wa_core::user::Texture> {
    Some(wa_core::user::Texture { id: v["id"].as_str()?.to_owned(), url: v["url"].as_str()?.to_owned() })
}

/// ApplicationDefinitionInterface as the front's ApplicationMessage.
pub fn application_of(a: &serde_json::Value) -> pb::ApplicationMessage {
    let s = |k: &str| a[k].as_str().map(str::to_owned);
    let b = |k: &str| a[k].as_bool();
    pb::ApplicationMessage {
        name: s("name").unwrap_or_default(),
        script: s("script"),
        doc: s("doc"),
        description: s("description"),
        image: s("image"),
        enabled: b("enabled"),
        regex_url: s("regexUrl"),
        target_url: s("targetUrl"),
        default: b("default"),
        force_new_tab: b("forceNewTab"),
        allow_api: b("allowAPI"),
        policy: s("policy"),
        image_logo: s("imageLogo"),
    }
}

async fn prepare(state: &AppState, query: Option<&str>, token: &str, headers: &HeaderMap) -> Upgrade {
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
            return internal_error(&format!(
                "Parameter lastReceivedNonce: Expected nonnegative integer, received {raw}"
            ));
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

    let texture_ids: Vec<String> =
        pairs.iter().filter(|(k, _)| k == "characterTextureIds").map(|(_, v)| v.clone()).collect();
    let ip_address = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split(',').next())
        .map(|v| v.trim().to_owned())
        .unwrap_or_default();
    if let Some(admin) = &state.admin {
        // A3: the admin says who this is, what they wear and what they may do (bans and full worlds included).
        let companion_id = get("companionTextureId").filter(|c| !c.is_empty());
        let chat_id = get("chatID").filter(|c| !c.is_empty());
        let locale = headers.get(header::ACCEPT_LANGUAGE).and_then(|v| v.to_str().ok());
        let access = admin
            .room_access(crate::admin_api::RoomAccess {
                user_identifier: &claims.identifier,
                play_uri: &room_id,
                ip_address: &ip_address,
                character_texture_ids: &texture_ids,
                companion_texture_id: companion_id.as_deref(),
                access_token: claims.access_token.as_deref(),
                chat_id: chat_id.as_deref(),
                locale,
            })
            .await;
        if access["status"] != "ok" {
            return Upgrade::Reject(Box::new(admin_error_screen(&access)));
        }
        if access["isCharacterTexturesValid"] == false {
            return Upgrade::Reject(Box::new(M::InvalidCharacterTextureMessage(pb::InvalidCharacterTextureMessage {
                message: "Invalid character textures".into(),
            })));
        }
        if access["isCompanionTextureValid"] == false {
            return Upgrade::Reject(Box::new(M::InvalidCompanionTextureMessage(pb::InvalidCompanionTextureMessage {
                message: "Invalid companion texture".into(),
            })));
        }
        let strs = |k: &str| -> Vec<String> {
            access[k].as_array().into_iter().flatten().filter_map(|v| v.as_str().map(str::to_owned)).collect()
        };
        return Upgrade::Fresh(Box::new(SessionInfo {
            world: access["world"].as_str().unwrap_or_default().to_owned(),
            can_edit: access["canEdit"].as_bool().unwrap_or(false),
            can_record: access["canRecord"].as_bool().unwrap_or(false),
            analytics_enabled: access["analyticsEventsEnabled"].as_bool().unwrap_or(true),
            room_id,
            token: token.to_owned(),
            user_uuid: access["userUuid"].as_str().unwrap_or_default().to_owned(),
            is_logged: claims.access_token.is_some(),
            ip_address,
            tags: strs("tags"),
            textures: access["characterTextures"].as_array().into_iter().flatten().filter_map(texture_of).collect(),
            companion: texture_of(&access["companionTexture"]),
            visit_card_url: access["visitCardUrl"].as_str().map(str::to_owned),
            chat_id: access["chatID"].as_str().map(str::to_owned).or(chat_id),
            room_name: get("roomName").filter(|r| !r.is_empty()),
            tab_id: get("tabId").unwrap_or_default(),
            connection_id,
            last_command_id: get("lastCommandId").filter(|c| !c.is_empty()),
            applications: access["applications"].as_array().into_iter().flatten().map(application_of).collect(),
            user_room_token: access["userRoomToken"].as_str().unwrap_or_default().to_owned(),
            activated_invite_user: access["activatedInviteUser"].as_bool().unwrap_or(true),
        }));
    }
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
                return Upgrade::Reject(Box::new(M::InvalidCompanionTextureMessage(
                    pb::InvalidCompanionTextureMessage { message: "Invalid companion texture".into() },
                )));
            }
        },
    };
    let Some(world) = local_admin::world_of(&room_id) else {
        return internal_error("User cannot access this world");
    };
    let tags = claims.tags.clone().unwrap_or_default();
    Upgrade::Fresh(Box::new(SessionInfo {
        can_record: local_admin::can_record(&state.config, claims.access_token.is_some()),
        analytics_enabled: false,
        activated_invite_user: true,
        user_room_token: String::new(),
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
        last_command_id: get("lastCommandId").filter(|c| !c.is_empty()),
        applications: local_admin::applications(&state.config),
    }))
}

pub async fn ws_room(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    headers: HeaderMap,
    RawQuery(query): RawQuery,
) -> Response {
    // The token travels as the sub-protocol and must be echoed, or the browser fails the handshake.
    let token = headers.get(header::SEC_WEBSOCKET_PROTOCOL).and_then(|v| v.to_str().ok()).unwrap_or("").to_owned();
    let mut ws = ws.max_message_size(MAX_MESSAGE).max_frame_size(MAX_MESSAGE);
    if !token.is_empty() {
        ws = ws.protocols([token.clone()]);
    }
    match prepare(&state, query.as_deref(), &token, &headers).await {
        Upgrade::Fresh(info) => ws.on_upgrade(move |socket| async move {
            let parts = Session::start(*info, socket, state.config.client_disconnection_retention, &state.budgets);
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{Config, Env};
    use pb::server_to_client_message::Message as M;

    fn state(vars: &[(&str, &str)]) -> AppState {
        let mut all = vec![("SECRET_KEY", "s")];
        all.extend_from_slice(vars);
        AppState::new(
            Config::load(Env::new(all.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect())).unwrap(),
        )
    }

    const BASE: &str = "roomId=http%3A%2F%2Fplay.test%2F_%2Fglobal%2Fmaps.test%2Fm.json&version=v&chatID=&roomName=r&cameraState=true&microphoneState=true&tabId=t";

    fn screen(u: Upgrade) -> pb::ErrorScreenMessage {
        match u {
            Upgrade::Reject(m) => match *m {
                M::ErrorScreenMessage(e) => e,
                other => panic!("not an error screen: {other:?}"),
            },
            _ => panic!("not a rejection"),
        }
    }

    #[tokio::test]
    async fn an_upgrade_is_refused_for_each_reason_the_pusher_has() {
        let s = state(&[]);
        let h = HeaderMap::new();
        // Missing parameters, each named.
        let e = screen(prepare(&s, Some("roomId=x"), "", &h).await);
        assert_eq!(e.code.as_deref(), Some("WS_BAD_REQUEST"));
        assert!(e.details.unwrap().contains("Parameter tabId: Required"));
        // A resume: a bad nonce, then a session that is not retained.
        let e = screen(prepare(&s, Some(&format!("{BASE}&lastReceivedNonce=abc")), "", &h).await);
        assert!(e.details.unwrap().contains("lastReceivedNonce"));
        let r = prepare(&s, Some(&format!("{BASE}&lastReceivedNonce=3&connectionId=gone")), "", &h).await;
        assert!(matches!(r, Upgrade::Refuse(1008, _)));
        // A token that does not verify.
        let r = prepare(&s, Some(BASE), "not.a.jwt", &h).await;
        assert!(matches!(r, Upgrade::Reject(m) if matches!(*m, M::TokenExpiredMessage(_))));
        // Unknown textures and companions.
        let r = prepare(&s, Some(&format!("{BASE}&characterTextureIds=nope")), "", &h).await;
        assert!(matches!(r, Upgrade::Reject(m) if matches!(*m, M::InvalidCharacterTextureMessage(_))));
        let r = prepare(&s, Some(&format!("{BASE}&companionTextureId=nope")), "", &h).await;
        assert!(matches!(r, Upgrade::Reject(m) if matches!(*m, M::InvalidCompanionTextureMessage(_))));
        // A room of no world.
        let r = prepare(
            &s,
            Some(&BASE.replace("http%3A%2F%2Fplay.test%2F_%2Fglobal%2Fmaps.test%2Fm.json", "nowhere")),
            "",
            &h,
        )
        .await;
        assert_eq!(screen(r).code.as_deref(), Some("internal_error"));
        // Anonymous players, when they are not allowed.
        let s = state(&[("DISABLE_ANONYMOUS", "true")]);
        assert_eq!(screen(prepare(&s, Some(BASE), "", &h).await).details.as_deref(), Some("Expecting token"));
        // And the fresh session otherwise, with the forwarded address.
        let mut h = HeaderMap::new();
        h.insert("x-forwarded-for", "203.0.113.7, 10.0.0.1".parse().unwrap());
        let Upgrade::Fresh(info) = prepare(&state(&[]), Some(BASE), "", &h).await else { panic!("refused") };
        assert_eq!(
            (info.ip_address.as_str(), info.tab_id.as_str(), info.world.as_str()),
            ("203.0.113.7", "t", "http://play.test")
        );
    }

    #[test]
    fn the_admins_errors_and_applications_reach_the_front_as_the_pusher_sends_them() {
        let retry = serde_json::json!({"type": "retry", "code": "C", "title": "T", "subtitle": "S", "details": "D",
            "image": "i", "imageLogo": "l", "buttonTitle": "B", "canRetryManual": true, "timeToRetry": 5});
        let M::ErrorScreenMessage(e) = admin_error_screen(&retry) else { panic!() };
        assert_eq!(
            (e.code.as_deref(), e.button_title.as_deref(), e.time_to_retry, e.can_retry_manual),
            (Some("C"), Some("B"), Some(5), Some(true))
        );
        let M::ErrorScreenMessage(e) =
            admin_error_screen(&serde_json::json!({"type": "error", "buttonTitle": "B", "code": "X"}))
        else {
            panic!()
        };
        assert_eq!((e.code.as_deref(), e.button_title), (Some("X"), None));
        let M::ErrorScreenMessage(e) =
            admin_error_screen(&serde_json::json!({"type": "redirect", "urlToRedirect": "/u", "code": "X"}))
        else {
            panic!()
        };
        assert_eq!((e.url_to_redirect.as_deref(), e.code), (Some("/u"), None));
        let app = application_of(
            &serde_json::json!({"name": "Klaxoon", "allowAPI": true, "regexUrl": "k", "forceNewTab": false}),
        );
        assert_eq!(
            (app.name.as_str(), app.allow_api, app.regex_url.as_deref(), app.force_new_tab),
            ("Klaxoon", Some(true), Some("k"), Some(false))
        );
        assert!(texture_of(&serde_json::json!({"id": "a"})).is_none());
    }
}
