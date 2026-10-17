//! The OSS mode, when ADMIN_API_URL is empty (the pusher's LocalAdmin, LocalWokaService, IceServersService).
//! The SaaS admin API will be a second implementation of the same calls.

use std::sync::LazyLock;

use base64::Engine;
use hmac::{Hmac, KeyInit, Mac};
use serde_json::{Value, json};
use sha1::Sha1;
use wa_core::user::Texture;
use wa_proto::messages as pb;

use crate::config::Config;

pub static WOKA_JSON: &str = include_str!(concat!(env!("WA_PUSHER_DATA_DIR"), "/woka.json"));
pub static COMPANIONS_JSON: &str = include_str!(concat!(env!("WA_PUSHER_DATA_DIR"), "/companions.json"));

static WOKA: LazyLock<Value> = LazyLock::new(|| serde_json::from_str(WOKA_JSON).expect("woka.json is valid"));
static COMPANIONS: LazyLock<Value> =
    LazyLock::new(|| serde_json::from_str(COMPANIONS_JSON).expect("companions.json is valid"));

const WOKA_PARTS: [&str; 7] = ["woka", "body", "eyes", "hair", "clothes", "hat", "accessory"];

fn texture(t: &Value) -> Option<Texture> {
    Some(Texture {
        id: t["id"].as_str()?.to_owned(),
        url: t["url"].as_str()?.to_owned(),
    })
}

/// LocalWokaService.fetchWokaDetails: `None` if an id is unknown or repeated. The order follows the parts
/// and collections of woka.json, not the request.
pub fn resolve_textures(ids: &[String]) -> Option<Vec<Texture>> {
    let mut wanted: Vec<&String> = Vec::new();
    for id in ids {
        if !wanted.contains(&id) {
            wanted.push(id);
        }
    }
    let mut found = Vec::new();
    for part in WOKA_PARTS {
        for collection in WOKA[part]["collections"].as_array().into_iter().flatten() {
            let textures = collection["textures"].as_array();
            wanted.retain(|id| {
                match textures.into_iter().flatten().find(|t| t["id"].as_str() == Some(id.as_str())).and_then(texture) {
                    Some(t) => {
                        found.push(t);
                        false
                    }
                    None => true,
                }
            });
        }
    }
    (found.len() == ids.len()).then_some(found)
}

pub fn resolve_companion(id: &str) -> Option<Texture> {
    COMPANIONS
        .as_array()?
        .iter()
        .flat_map(|c| c["textures"].as_array().into_iter().flatten())
        .find(|t| t["id"].as_str() == Some(id))
        .and_then(texture)
}

/// The world of a room in OSS mode: the origin of its URL.
pub fn world_of(room_url: &str) -> Option<String> {
    let (scheme, rest) = room_url.split_once("://")?;
    let host = rest.split(['/', '?', '#']).next()?;
    (!host.is_empty()).then(|| format!("{scheme}://{host}"))
}

fn path_of(url: &str) -> &str {
    let rest = url.split_once("://").map_or(url, |(_, r)| r);
    let path = rest.find('/').map_or("/", |i| &rest[i..]);
    path.split(['?', '#']).next().unwrap_or("/")
}

/// The map-storage path of a room's WAM file (`/~/maps/a.wam` -> `maps/a.wam`), for a map-storage room.
pub fn wam_path(room_url: &str) -> Option<String> {
    let path = path_of(room_url);
    let rest = &path[path.find("/~/")? + 3..];
    rest.ends_with(".wam").then(|| rest.to_owned())
}

pub fn can_edit(config: &Config, room_url: &str, identifier: &str, tags: &[String]) -> bool {
    let editable_map = path_of(room_url).contains("/~/");
    let env = |k: &str| config.raw.get(k).map(String::as_str).unwrap_or("");
    let enabled = matches!(env("ENABLE_MAP_EDITOR"), "true" | "1");
    let allow_all = !matches!(env("MAP_EDITOR_ALLOW_ALL_USERS"), "false" | "0");
    let allowed_users = env("MAP_EDITOR_ALLOWED_USERS").split(',').any(|u| !u.is_empty() && u == identifier);
    let tagged = tags.iter().any(|t| t == "admin" || t == "editor");
    editable_map && enabled && (allow_all || allowed_users || tagged)
}

/// `GET /map` in OSS mode (LocalAdmin.fetchMapDetails).
/// isRecordingConfigured: the five LIVEKIT_RECORDING_S3_* variables are set.
pub fn recording_configured(config: &Config) -> bool {
    ["ENDPOINT", "BUCKET", "ACCESS_KEY", "SECRET_KEY", "REGION"]
        .iter()
        .all(|k| config.raw.get(&format!("LIVEKIT_RECORDING_S3_{k}")).is_some_and(|v| !v.is_empty()))
}

/// canRecord without an admin: recording is configured and the user is logged in.
pub fn can_record(config: &Config, is_logged: bool) -> bool {
    is_logged && recording_configured(config)
}

pub fn map_details(config: &Config, play_uri: &str) -> Value {
    let env = |k: &str| config.raw.get(k).filter(|v| !v.is_empty()).cloned();
    let flag = |k: &str, default: bool| match env(k).as_deref() {
        Some("true" | "1") => true,
        Some("false" | "0") => false,
        _ => default,
    };
    let path = path_of(play_uri);
    if path == "/" {
        let origin = world_of(play_uri).unwrap_or_default();
        return json!({ "redirectUrl": format!("{origin}{}", config.start_room_url) });
    }
    let (map_url, wam_url, group) = if let Some(i) = path.find("/~/") {
        let rest = &path[i + 3..];
        if rest.ends_with(".tmj") {
            return json!({ "redirectUrl": play_uri.replacen(".tmj", ".wam", 1) });
        }
        let base = env("PUBLIC_MAP_STORAGE_URL").unwrap_or_default();
        (None, Some(format!("{base}/{rest}")), json!("default"))
    } else if let Some(rest) = path.strip_prefix("/_/").and_then(|r| r.split_once('/')).map(|(_, r)| r) {
        let scheme = play_uri.split_once("://").map_or("http", |(s, _)| s);
        (Some(format!("{scheme}://{rest}")), None, Value::Null)
    } else {
        return json!({
            "status": "error", "type": "error", "code": "UNSUPPORTED_URL_FORMAT",
            "title": "Unsupported URL format", "details": format!("Unsupported path: {path}"), "subtitle": "",
        });
    };
    let s3 = recording_configured(config);
    let matrix = ["MATRIX_PUBLIC_URI", "MATRIX_API_URI", "MATRIX_ADMIN_USER", "MATRIX_ADMIN_PASSWORD", "MATRIX_DOMAIN"]
        .iter()
        .all(|k| env(k).is_some());
    let mut details = serde_json::Map::new();
    if let Some(m) = map_url {
        details.insert("mapUrl".into(), m.into());
    }
    if let Some(w) = wam_url {
        details.insert("wamUrl".into(), w.into());
    }
    let wam = details.contains_key("wamUrl");
    let woka_policy = env("OPENID_WOKA_NAME_POLICY")
        .or_else(|| env("OPID_WOKA_NAME_POLICY"))
        .filter(|p| matches!(p.as_str(), "user_input" | "allow_override_opid" | "force_opid"));
    let rest = json!({
        "canEdit": wam && flag("ENABLE_MAP_EDITOR", false),
        "authenticationMandatory": config.disable_anonymous,
        "contactPage": null,
        "group": group,
        "opidLogoutRedirectUrl": null,
        "opidUsernamePolicy": woka_policy,
        "loadingLogo": null, "loginSceneLogo": null, "errorSceneLogo": null,
        "showPoweredBy": true,
        "loadingCowebsiteLogo": null,
        "enableChat": flag("ENABLE_CHAT", true),
        "enableChatUpload": flag("ENABLE_CHAT_UPLOAD", true),
        "enableChatOnlineList": flag("ENABLE_CHAT_ONLINE_LIST", true),
        "enableChatDisconnectedList": flag("ENABLE_CHAT_DISCONNECTED_LIST", true),
        "enableSay": flag("ENABLE_SAY", true),
        "enableIssueReport": flag("ENABLE_ISSUE_REPORT", true),
        "enableMatrixChat": matrix,
        "defaultWokaName": env("DEFAULT_WOKA_NAME"),
        "defaultWokaTexture": env("DEFAULT_WOKA_TEXTURE"),
        "skipCameraPage": flag("SKIP_CAMERA_PAGE", false),
        "defaultCameraPrivacySettings": flag("DEFAULT_CAMERA_PRIVACY_SETTINGS", false),
        "defaultMicrophonePrivacySettings": flag("DEFAULT_MICROPHONE_PRIVACY_SETTINGS", true),
        "bypassPwa": flag("BYPASS_PWA", false),
        "provideDefaultWokaName": env("PROVIDE_DEFAULT_WOKA_NAME"),
        "provideDefaultWokaTexture": env("PROVIDE_DEFAULT_WOKA_TEXTURE"),
        "metatags": crate::front::default_meta(),
        "recording": { "buttonState": if s3 { "enabled" } else { "hidden" }, "disabledReason": null },
        "metadata": { "enableTutorial": flag("ENABLE_TUTORIAL", true) },
    });
    for (k, v) in rest.as_object().expect("object literal") {
        // JSON.stringify drops undefined values.
        if !(v.is_null() && matches!(k.as_str(), "defaultWokaName" | "defaultWokaTexture" | "provideDefaultWokaName" | "provideDefaultWokaTexture")) {
            details.insert(k.clone(), v.clone());
        }
    }
    Value::Object(details)
}

/// The third-party applications the editor offers (LocalAdmin.fetchMemberDataByUuid), from the *_ENABLED
/// variables, in the same order.
pub fn applications(config: &Config) -> Vec<pb::ApplicationMessage> {
    let on = |k: &str| matches!(config.raw.get(k).map(String::as_str), Some("true" | "1"));
    [
        ("KLAXOON_ENABLED", "Klaxoon", "https://klaxoon.com", Some("https://static.klaxoon.com/favicon.ico"), "Klaxoon (Brainstorming, Quiz, Survey)"),
        ("YOUTUBE_ENABLED", "Youtube", "https://youtube.com", Some("https://www.youtube.com/favicon.ico"), "Youtube (Video sharing)"),
        ("GOOGLE_DRIVE_ENABLED", "Google Drive", "https://drive.google.com", None, "Google Drive (Docs, Sheets, Slides)"),
        ("GOOGLE_DOCS_ENABLED", "Google Docs", "https://docs.google.com", None, "Google Docs (Word Processor)"),
        ("GOOGLE_SHEETS_ENABLED", "Google Sheets", "https://sheets.google.com", None, "Google Sheets (Spreadsheet)"),
        ("GOOGLE_SLIDES_ENABLED", "Google Slides", "https://slides.google.com", None, "Google Slides (Presentation)"),
        ("ERASER_ENABLED", "Eraser", "https://workadventu.re", None, "Eraser (White board)"),
        ("EXCALIDRAW_ENABLED", "Excalidraw", "https://excalidraw.com", None, "Excalidraw (White board)"),
        ("CARDS_ENABLED", "Cards", "https://workadventu.re", None, "Cards (learning tool)"),
        ("TLDRAW_ENABLED", "tldraw", "https://tldraw.com", None, "tldraw (White board)"),
    ]
    .into_iter()
    .filter(|(flag, ..)| on(flag))
    .map(|(_, name, doc, image, description)| pb::ApplicationMessage {
        name: name.into(),
        doc: Some(doc.into()),
        image: image.map(Into::into),
        description: Some(description.into()),
        enabled: Some(true),
        default: Some(true),
        force_new_tab: Some(false),
        allow_api: Some(false),
        ..<pb::ApplicationMessage as Default>::default()
    })
    .collect()
}

/// IceServersService + WebRTCCredentialsService (coturn `use-auth-secret`).
pub fn ice_servers(config: &Config, user_id: i32) -> Vec<pb::IceServer> {
    let env = |k: &str| config.raw.get(k).filter(|v| !v.is_empty()).cloned();
    let urls = |v: String| v.split(',').map(|u| u.trim().to_owned()).collect();
    let mut servers = Vec::new();
    if let Some(stun) = env("STUN_SERVER") {
        servers.push(pb::IceServer {
            urls: urls(stun),
            ..pb::IceServer::default()
        });
    }
    if let Some(turn) = env("TURN_SERVER") {
        let (username, credential) = match env("TURN_STATIC_AUTH_SECRET") {
            Some(secret) => {
                let expiry = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map_or(0, |d| d.as_secs())
                    + 24 * 3600;
                let username = format!("{expiry}:{user_id}");
                let mut mac = Hmac::<Sha1>::new_from_slice(secret.as_bytes()).expect("any key length");
                mac.update(username.as_bytes());
                let credential = base64::engine::general_purpose::STANDARD.encode(mac.finalize().into_bytes());
                (Some(username), Some(credential))
            }
            None => (env("TURN_USER"), env("TURN_PASSWORD")),
        };
        servers.push(pb::IceServer {
            urls: urls(turn),
            username,
            credential,
            credential_type: Some("password".into()),
        });
    }
    servers
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Env;

    fn config(pairs: &[(&str, &str)]) -> Config {
        let mut vars: Vec<(String, String)> = pairs.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect();
        vars.push(("SECRET_KEY".into(), "s".into()));
        Config::load(Env::new(vars.into_iter().collect())).unwrap()
    }

    #[test]
    fn textures_resolve_in_woka_json_order_and_reject_unknown_or_repeated_ids() {
        let t = resolve_textures(&["male1".into()]).unwrap();
        assert_eq!(t[0].id, "male1");
        assert!(t[0].url.starts_with("resources/"));
        assert!(resolve_textures(&["nope".into()]).is_none());
        assert!(resolve_textures(&["male1".into(), "male1".into()]).is_none());
        assert_eq!(resolve_textures(&[]), Some(vec![]));
        assert!(resolve_companion("dog1").is_some());
    }

    #[test]
    fn map_urls_follow_the_local_admin_rules() {
        let c = config(&[("PUBLIC_MAP_STORAGE_URL", "http://map-storage.localhost")]);
        let d = map_details(&c, "http://play.localhost/_/global/maps.localhost/tests/E2E/empty.json?x=1");
        assert_eq!(d["mapUrl"], "http://maps.localhost/tests/E2E/empty.json");
        assert!(d.get("wamUrl").is_none());
        assert_eq!(map_details(&c, "http://play.localhost/~/maps/a.wam")["wamUrl"], "http://map-storage.localhost/maps/a.wam");
        assert_eq!(
            map_details(&c, "http://play.localhost/")["redirectUrl"],
            "http://play.localhost/_/global/maps.workadventu.re/starter/map.json"
        );
        assert_eq!(map_details(&c, "http://play.localhost/@/org/world/room")["code"], "UNSUPPORTED_URL_FORMAT");
        assert_eq!(world_of("http://play.localhost/_/global/x.json").as_deref(), Some("http://play.localhost"));
    }

    #[test]
    fn turn_credentials_use_the_static_secret() {
        let c = config(&[
            ("STUN_SERVER", "stun:a:1, stun:b:2"),
            ("TURN_SERVER", "turn:t:3"),
            ("TURN_STATIC_AUTH_SECRET", "k"),
        ]);
        let s = ice_servers(&c, 42);
        assert_eq!(s[0].urls, vec!["stun:a:1", "stun:b:2"]);
        assert_eq!(s[0].username, None);
        assert!(s[1].username.as_deref().unwrap().ends_with(":42"));
        assert_eq!(s[1].credential_type.as_deref(), Some("password"));
    }
}
