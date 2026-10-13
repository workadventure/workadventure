//! What the browser asks before the WebSocket: the HTML page (FrontController), its assets (proxied to the
//! `front` container), the map details, the anonymous login and the woka lists.
//!
//! The page template is the front container's index.html (RemoteFrontAssets): polled with its ETag every 2 s
//! until loaded, then every 30 s.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use axum::Router;
use axum::body::Body;
use axum::extract::{RawQuery, Request, State};
use axum::http::{HeaderMap, Method, StatusCode, header};
use axum::response::{IntoResponse, Redirect, Response};
use axum::routing::{any, get, post};
use parking_lot::RwLock;
use serde_json::{Value, json};

use crate::AppState;
use crate::config::Config;
use crate::jwt::{self, Claims};
use crate::local_admin;
use crate::mustache::{Context, Template, Value as V};

pub struct FrontAssets {
    template: RwLock<Option<Template>>,
    /// The front's apiVersionHash: API_VERSION_HASH, or else the one of the first template served.
    api_version: RwLock<Option<String>>,
}

impl FrontAssets {
    pub fn new(config: &Config) -> Self {
        Self {
            template: RwLock::new(None),
            api_version: RwLock::new(config.raw.get("API_VERSION_HASH").filter(|v| !v.is_empty()).cloned()),
        }
    }

    pub fn is_ready(&self) -> bool {
        self.template.read().is_some()
    }

    pub fn api_version(&self) -> Option<String> {
        self.api_version.read().clone()
    }
}

pub fn query_pairs(raw: Option<&str>) -> Vec<(String, String)> {
    form_urlencoded::parse(raw.unwrap_or("").as_bytes())
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect()
}

fn query_get<'a>(pairs: &'a [(String, String)], key: &str) -> Option<&'a str> {
    pairs.iter().find(|(k, _)| k == key).map(|(_, v)| v.as_str())
}

/// `./assets/...` and the dev `/src/`, `/@vite/` paths point to the front's public URL.
fn rewrite_asset_urls(html: &str, assets_url: &str) -> String {
    let mut out = html.to_owned();
    for ws in [' ', '\n', '\t', '\r'] {
        for attr in ["src", "href"] {
            out = out.replace(&format!("{ws}{attr}=\"./assets/"), &format!("{ws}{attr}=\"{assets_url}/assets/"));
            for dev in ["src/", "@vite/"] {
                out = out.replace(&format!("{ws}{attr}=\"/{dev}"), &format!("{ws}{attr}=\"{assets_url}/{dev}"));
            }
        }
    }
    out
}

fn api_version_of(html: &str) -> Option<&str> {
    let i = html.find(r#"name="wa-api-version" content=""#)? + r#"name="wa-api-version" content=""#.len();
    let end = html[i..].find('"')?;
    Some(&html[i..i + end])
}

/// Keeps the template up to date. Runs for the life of the process.
pub async fn poll_template(state: AppState) {
    let (Some(internal), Some(public)) = (state.config.assets_internal_url.clone(), state.config.assets_url.clone())
    else {
        tracing::warn!("ASSETS_URL is not set: no front container to serve the page from");
        return;
    };
    let client = reqwest::Client::new();
    let mut etag: Option<String> = None;
    loop {
        let mut req = client.get(format!("{internal}/index.html")).timeout(Duration::from_secs(10));
        if let Some(e) = &etag {
            req = req.header(header::IF_NONE_MATCH, e);
        }
        match req.send().await {
            Ok(r) if r.status() == StatusCode::NOT_MODIFIED => {}
            Ok(r) if r.status().is_success() => {
                let new_etag = r.headers().get(header::ETAG).and_then(|v| v.to_str().ok()).map(str::to_owned);
                if let Ok(html) = r.text().await {
                    let version = api_version_of(&html).map(str::to_owned);
                    let expected = state.front.api_version();
                    if expected.is_some() && version.is_some() && expected != version {
                        tracing::error!(?expected, ?version, "ignoring a front template of another API version");
                    } else {
                        match Template::parse(&rewrite_asset_urls(&html, &public)) {
                            Ok(t) => {
                                *state.front.template.write() = Some(t);
                                if expected.is_none() && version.is_some() {
                                    *state.front.api_version.write() = version;
                                }
                                etag = new_etag;
                            }
                            Err(e) => tracing::error!(?e, "invalid front template"),
                        }
                    }
                }
            }
            Ok(r) => tracing::warn!(status = %r.status(), "could not load the front template"),
            Err(e) => tracing::warn!(error = %e, "could not reach the front container"),
        }
        let every = if state.front.is_ready() { 30 } else { 2 };
        tokio::time::sleep(Duration::from_secs(every)).await;
    }
}

pub fn default_meta() -> Value {
    json!({
        "title": "WorkAdventure",
        "description": "Organize your online event in WorkAdventure to recreate spontaneous social interactions. Connect, collaborate and have fun with your teammates and attendees.",
        "author": "WorkAdventure team",
        "provider": "WorkAdventure",
        "favIcons": [{"rel": "icon", "sizes": "512x512", "src": "/static/images/favicons/favicon-512x512.svg"}],
        "manifestIcons": [{"src": "/static/images/favicons/icon-512x512.png", "sizes": "512x512", "type": "image/png"}],
        "appName": "WorkAdventure",
        "shortAppName": "WA",
        "themeColor": "#1B2A41",
        "cardImage": "https://workadventu.re/images/general/logo-og.png",
    })
}

/// FRONT_ENVIRONMENT_VARIABLES: the `window.env` of the page.
pub fn front_env(c: &Config) -> Value {
    let raw = |k: &str| c.raw.get(k).cloned();
    let s = |k: &str| c.raw.get(k).filter(|v| !v.is_empty()).cloned();
    let b = |k: &str, d: bool| match c.raw.get(k).map(String::as_str) {
        Some("true" | "1") => true,
        Some("false" | "0") => false,
        _ => d,
    };
    let n = |k: &str, d: f64| s(k).and_then(|v| v.parse::<f64>().ok()).unwrap_or(d);
    let mut env = json!({
        "DEBUG_MODE": b("DEBUG_MODE", false),
        "PUSHER_URL": c.pusher_url,
        "FRONT_URL": c.front_url,
        "ADMIN_URL": raw("ADMIN_URL"),
        "UPLOADER_URL": raw("UPLOADER_URL").unwrap_or_default(),
        "ICON_URL": raw("ICON_URL").unwrap_or_default(),
        "SKIP_RENDER_OPTIMIZATIONS": b("SKIP_RENDER_OPTIMIZATIONS", false),
        "JITSI_URL": raw("JITSI_URL"),
        "JITSI_PRIVATE_MODE": b("JITSI_PRIVATE_MODE", false),
        "ENABLE_MAP_EDITOR": b("ENABLE_MAP_EDITOR", false),
        "PUBLIC_MAP_STORAGE_PREFIX": s("PUBLIC_MAP_STORAGE_URL").map(|u| {
            let rest = u.split_once("://").map_or(u.as_str(), |(_, r)| r);
            rest.find('/').map_or("/".to_owned(), |i| rest[i..].to_owned())
        }),
        "MAX_USERNAME_LENGTH": n("MAX_USERNAME_LENGTH", 10.0),
        "MAX_PER_GROUP": c.max_per_group,
        "MAX_DISPLAYED_VIDEOS": n("MAX_DISPLAYED_VIDEOS", 16.0),
        "LIVEKIT_PIXEL_DENSITY": n("LIVEKIT_PIXEL_DENSITY", 2.0 / 3.0),
        "NODE_ENV": s("NODE_ENV").unwrap_or_else(|| "development".into()),
        "CONTACT_URL": raw("CONTACT_URL"),
        "POSTHOG_API_KEY": raw("POSTHOG_API_KEY"),
        "POSTHOG_URL": raw("POSTHOG_URL"),
        "DISABLE_ANONYMOUS": c.disable_anonymous,
        "ENABLE_OPENID": s("OPENID_CLIENT_ID").is_some() || s("OPID_CLIENT_ID").is_some(),
        "OPID_PROFILE_SCREEN_PROVIDER": s("OPENID_PROFILE_SCREEN_PROVIDER").or_else(|| s("OPID_PROFILE_SCREEN_PROVIDER")),
        "OPID_WOKA_NAME_POLICY": s("OPENID_WOKA_NAME_POLICY").or_else(|| s("OPID_WOKA_NAME_POLICY")).unwrap_or_else(|| "user_input".into()),
        "ENABLE_CHAT_UPLOAD": b("ENABLE_CHAT_UPLOAD", true),
        "FALLBACK_LOCALE": raw("FALLBACK_LOCALE"),
        "ENABLE_REPORT_ISSUES_MENU": b("ENABLE_REPORT_ISSUES_MENU", false),
        "REPORT_ISSUES_URL": raw("REPORT_ISSUES_URL"),
        "CLIENT_DISCONNECTION_RETENTION_MS": c.client_disconnection_retention.as_millis() as u64,
        "SENTRY_DSN_FRONT": raw("SENTRY_DSN_FRONT"),
        "SENTRY_DSN_PUSHER": raw("SENTRY_DSN_PUSHER"),
        "SENTRY_ENVIRONMENT": raw("SENTRY_ENVIRONMENT"),
        "SENTRY_RELEASE": raw("SENTRY_RELEASE"),
        "SENTRY_TRACES_SAMPLE_RATE": n("SENTRY_TRACES_SAMPLE_RATE", 0.1),
        "WOKA_SPEED": n("WOKA_SPEED", 9.0),
        "KLAXOON_ENABLED": b("KLAXOON_ENABLED", false),
        "KLAXOON_CLIENT_ID": raw("KLAXOON_CLIENT_ID"),
        "YOUTUBE_ENABLED": b("YOUTUBE_ENABLED", false),
        "GOOGLE_DRIVE_ENABLED": b("GOOGLE_DRIVE_ENABLED", false),
        "GOOGLE_DOCS_ENABLED": b("GOOGLE_DOCS_ENABLED", false),
        "GOOGLE_SHEETS_ENABLED": b("GOOGLE_SHEETS_ENABLED", false),
        "GOOGLE_SLIDES_ENABLED": b("GOOGLE_SLIDES_ENABLED", false),
        "ERASER_ENABLED": b("ERASER_ENABLED", false),
        "EXCALIDRAW_ENABLED": b("EXCALIDRAW_ENABLED", false),
        "EXCALIDRAW_DOMAINS": s("EXCALIDRAW_DOMAINS").map_or(vec![], |v| v.split(',').map(str::to_owned).collect::<Vec<_>>()),
        "CARDS_ENABLED": b("CARDS_ENABLED", false),
        "TLDRAW_ENABLED": b("TLDRAW_ENABLED", false),
        "MINIMUM_DISTANCE": c.minimum_distance,
        "GOOGLE_DRIVE_PICKER_CLIENT_ID": raw("GOOGLE_DRIVE_PICKER_CLIENT_ID"),
        "GOOGLE_DRIVE_PICKER_APP_ID": raw("GOOGLE_DRIVE_PICKER_APP_ID"),
        "EMBEDLY_KEY": raw("EMBEDLY_KEY"),
        "MATRIX_PUBLIC_URI": raw("MATRIX_PUBLIC_URI"),
        "ENABLE_CHAT": b("ENABLE_CHAT", true),
        "ENABLE_CHAT_ONLINE_LIST": b("ENABLE_CHAT_ONLINE_LIST", true),
        "ENABLE_CHAT_DISCONNECTED_LIST": b("ENABLE_CHAT_DISCONNECTED_LIST", true),
        "MATRIX_ADMIN_USER": raw("MATRIX_ADMIN_USER"),
        "MATRIX_DOMAIN": raw("MATRIX_DOMAIN"),
        "ENABLE_SAY": b("ENABLE_SAY", true),
        "ENABLE_ISSUE_REPORT": b("ENABLE_ISSUE_REPORT", true),
        "GRPC_MAX_MESSAGE_SIZE": n("GRPC_MAX_MESSAGE_SIZE", 20.0 * 1024.0 * 1024.0),
        "TURN_CREDENTIALS_RENEWAL_TIME": n("TURN_CREDENTIALS_RENEWAL_TIME", 3_600_000.0),
        "DEFAULT_WOKA_NAME": raw("DEFAULT_WOKA_NAME").unwrap_or_default(),
        "DEFAULT_WOKA_TEXTURE": raw("DEFAULT_WOKA_TEXTURE").unwrap_or_default(),
        "SKIP_CAMERA_PAGE": b("SKIP_CAMERA_PAGE", false),
        "BYPASS_PWA": b("BYPASS_PWA", false),
        "PROVIDE_DEFAULT_WOKA_NAME": s("PROVIDE_DEFAULT_WOKA_NAME"),
        "PROVIDE_DEFAULT_WOKA_TEXTURE": s("PROVIDE_DEFAULT_WOKA_TEXTURE"),
        "ENABLE_TUTORIAL": b("ENABLE_TUTORIAL", true),
    });
    // JSON.stringify leaves undefined keys out; integral numbers print without ".0".
    let obj = env.as_object_mut().expect("object literal");
    obj.retain(|_, v| !v.is_null());
    for v in obj.values_mut() {
        if let Some(f) = v.as_f64()
            && f.fract() == 0.0
            && f.abs() < 9e15
        {
            *v = json!(f as i64);
        }
    }
    env
}

fn page_script(c: &Config) -> String {
    format!(
        "window.env = {}\nwindow.capabilities = {}",
        front_env(c),
        r#"{"api/woka/list":"v1","api/companion/list":"v1"}"#
    )
}

fn full_url(headers: &HeaderMap, uri: &axum::http::Uri) -> String {
    let proto = headers
        .get("x-forwarded-proto")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("http");
    let host = headers.get(header::HOST).and_then(|v| v.to_str().ok()).unwrap_or("");
    let path = uri.path_and_query().map_or("/", |p| p.as_str());
    format!("{proto}://{host}{path}")
}

async fn page(State(state): State<AppState>, request: Request) -> Response {
    let (parts, body) = request.into_parts();
    let url = full_url(&parts.headers, &parts.uri);
    let auth_token = if parts.method == Method::POST {
        let bytes = axum::body::to_bytes(body, 64 * 1024).await.unwrap_or_default();
        query_pairs(std::str::from_utf8(&bytes).ok())
            .into_iter()
            .find(|(k, _)| k == "authToken")
            .map(|(_, v)| v)
    } else {
        None
    };
    let template = state.front.template.read().clone();
    let Some(template) = template else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            [(header::RETRY_AFTER, "2")],
            "WorkAdventure is starting, please retry in a few seconds.",
        )
            .into_response();
    };
    let meta = default_meta();
    let mut ctx = Context::new();
    for key in ["title", "description", "author", "provider", "appName", "shortAppName", "themeColor", "cardImage"] {
        ctx.insert(key, V::Str(meta[key].as_str().unwrap_or_default().to_owned()));
    }
    let fav: Vec<HashMap<&'static str, String>> = meta["favIcons"]
        .as_array()
        .into_iter()
        .flatten()
        .map(|f| {
            ["rel", "sizes", "src"]
                .into_iter()
                .map(|k| (k, f[k].as_str().unwrap_or_default().to_owned()))
                .collect()
        })
        .collect();
    let tile = fav.last().and_then(|f| f.get("src").cloned()).unwrap_or_default();
    ctx.insert("favIcons", V::List(fav));
    ctx.insert("msApplicationTileImage", V::Str(tile));
    ctx.insert("url", V::Str(url));
    ctx.insert("script", V::Str(state.page_script.to_string()));
    let env = |k: &str| state.config.raw.get(k).cloned().unwrap_or_default();
    ctx.insert("posthogApiKey", V::Str(env("POSTHOG_API_KEY")));
    ctx.insert("posthogUrl", V::Str(env("POSTHOG_URL")));
    ctx.insert("googleDrivePickerClientId", V::Str(env("GOOGLE_DRIVE_PICKER_CLIENT_ID")));
    ctx.insert("authToken", V::Str(auth_token.unwrap_or_default()));
    ctx.insert(
        "assetsOrigin",
        V::Str(state.config.assets_url.as_deref().and_then(local_admin::world_of).unwrap_or_default()),
    );
    ctx.insert("cssVariablesOverride", V::Str(String::new()));
    (
        [
            (header::CACHE_CONTROL, "no-cache"),
            (header::CONTENT_TYPE, "text/html; charset=utf-8"),
        ],
        template.render(&ctx),
    )
        .into_response()
}

async fn map(State(state): State<AppState>, RawQuery(q): RawQuery) -> Response {
    let pairs = query_pairs(q.as_deref());
    let Some(play_uri) = query_get(&pairs, "playUri") else {
        return (StatusCode::BAD_REQUEST, axum::Json(json!(["Parameter playUri: Required"]))).into_response();
    };
    axum::Json(local_admin::map_details(&state.config, play_uri)).into_response()
}

async fn anonym_login(State(state): State<AppState>) -> Response {
    if state.config.disable_anonymous {
        return StatusCode::FORBIDDEN.into_response();
    }
    let uuid = uuid::Uuid::new_v4().to_string();
    let token = jwt::create(
        &state.config.secret_key,
        Claims {
            identifier: uuid.clone(),
            ..Claims::default()
        },
    );
    axum::Json(json!({ "authToken": token, "userUuid": uuid })).into_response()
}

/// `GET /me` without OpenID: who the token is, and whether the stored wokas are still valid.
async fn me(State(state): State<AppState>, RawQuery(q): RawQuery) -> Response {
    let pairs = query_pairs(q.as_deref());
    let (Some(token), Some(play_uri)) = (query_get(&pairs, "token"), query_get(&pairs, "playUri")) else {
        return (StatusCode::BAD_REQUEST, axum::Json(json!(["Parameter token or playUri: Required"]))).into_response();
    };
    let Ok(claims) = jwt::verify(&state.config.secret_key, token) else {
        return (StatusCode::UNAUTHORIZED, "Invalid token").into_response();
    };
    let ids: Vec<String> = pairs
        .iter()
        .filter(|(k, _)| k == "localStorageCharacterTextureIds[]" || k == "localStorageCharacterTextureIds")
        .map(|(_, v)| v.clone())
        .collect();
    let textures = local_admin::resolve_textures(&ids);
    let companion_id = query_get(&pairs, "localStorageCompanionTextureId").filter(|c| !c.is_empty());
    let companion = companion_id.map(local_admin::resolve_companion);
    let tags = claims.tags.clone().unwrap_or_default();
    let mut body = json!({
        "authToken": token,
        "username": claims.username,
        "locale": claims.locale,
        "status": "ok",
        "email": claims.identifier,
        "userUuid": claims.identifier,
        "tags": tags,
        "visitCardUrl": null,
        "isCharacterTexturesValid": textures.is_some(),
        "characterTextures": textures.unwrap_or_default().iter().map(|t| json!({"id": t.id, "url": t.url})).collect::<Vec<_>>(),
        "isCompanionTextureValid": !matches!(companion, Some(None)),
        "companionTexture": companion.flatten().map(|t| json!({"id": t.id, "url": t.url})),
        "activatedInviteUser": true,
        "canEdit": local_admin::can_edit(&state.config, play_uri, &claims.identifier, &tags),
        "world": local_admin::world_of(play_uri),
        "applications": [],
        "canRecord": false,
        "analyticsEventsEnabled": false,
        "matrixUserId": claims.matrix_user_id,
        "matrixServerUrl": state.config.raw.get("MATRIX_PUBLIC_URI"),
    });
    body.as_object_mut().expect("object").retain(|k, v| !v.is_null() || k == "visitCardUrl");
    axum::Json(body).into_response()
}

async fn data_list(state: &AppState, headers: &HeaderMap, q: Option<&str>, data: &'static str) -> Response {
    let Some(token) = headers.get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()) else {
        return (StatusCode::UNAUTHORIZED, "Undefined authorization header").into_response();
    };
    if jwt::verify(&state.config.secret_key, token).is_err() {
        return (StatusCode::UNAUTHORIZED, "Invalid token sent").into_response();
    }
    if query_get(&query_pairs(q), "roomUrl").is_none() {
        return (StatusCode::BAD_REQUEST, axum::Json(json!(["Parameter roomUrl: Required"]))).into_response();
    }
    ([(header::CONTENT_TYPE, "application/json; charset=utf-8")], data).into_response()
}

async fn woka_list(State(state): State<AppState>, headers: HeaderMap, RawQuery(q): RawQuery) -> Response {
    data_list(&state, &headers, q.as_deref(), local_admin::WOKA_JSON).await
}

async fn companion_list(State(state): State<AppState>, headers: HeaderMap, RawQuery(q): RawQuery) -> Response {
    data_list(&state, &headers, q.as_deref(), local_admin::COMPANIONS_JSON).await
}

/// Static files of the front container (AssetsProxy).
async fn proxy(State(state): State<AppState>, request: Request) -> Response {
    if request.method() != Method::GET && request.method() != Method::HEAD {
        return StatusCode::NOT_FOUND.into_response();
    }
    let Some(internal) = &state.config.assets_internal_url else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let path = request.uri().path_and_query().map_or("/", |p| p.as_str());
    let mut upstream = state.http.request(request.method().clone(), format!("{internal}{path}"));
    for h in [header::IF_NONE_MATCH, header::IF_MODIFIED_SINCE] {
        if let Some(v) = request.headers().get(&h) {
            upstream = upstream.header(h, v);
        }
    }
    let Ok(response) = upstream.send().await else {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    };
    let mut builder = Response::builder().status(response.status());
    for h in [
        header::CONTENT_TYPE,
        header::CACHE_CONTROL,
        header::ETAG,
        header::LAST_MODIFIED,
        header::EXPIRES,
    ] {
        if let Some(v) = response.headers().get(&h) {
            builder = builder.header(h, v.clone());
        }
    }
    builder
        .body(Body::from_stream(response.bytes_stream()))
        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
}

pub fn routes() -> Router<AppState> {
    let mut router = Router::new()
        .route("/", get(page))
        .route("/login", get(page))
        .route("/_/{*rest}", get(page).post(page))
        .route("/@/{*rest}", get(page).post(page))
        .route("/~/{*rest}", get(page).post(page))
        .route("/index.html", get(|| async { Redirect::to("/") }))
        .route("/map", get(map))
        .route("/anonymLogin", post(anonym_login))
        .route("/me", get(me))
        .route("/woka/list", get(woka_list))
        .route("/companion/list", get(companion_list));
    for prefix in ["/assets", "/static", "/resources", "/collections"] {
        router = router.route(&format!("{prefix}/{{*rest}}"), any(proxy));
    }
    for file in [
        "/iframe_api.js",
        "/iframe_api.js.map",
        "/service-worker-dev.js",
        "/service-worker-prod.js",
        "/notification-service-worker.js",
    ] {
        router = router.route(file, any(proxy));
    }
    router
}

pub fn script(config: &Config) -> Arc<str> {
    page_script(config).into()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Env;

    #[test]
    fn asset_urls_point_to_the_front_container() {
        let html = r#"<script type="module" src="./assets/index-1.js"></script>
<link href="./assets/a.css"><img src="./static/x.png"><script src="/@vite/client">"#;
        let out = rewrite_asset_urls(html, "http://front");
        assert!(out.contains(r#"src="http://front/assets/index-1.js""#));
        assert!(out.contains(r#"href="http://front/assets/a.css""#));
        assert!(out.contains(r#"src="./static/x.png""#), "static stays relative");
        assert!(out.contains(r#"src="http://front/@vite/client""#));
        assert_eq!(api_version_of(r#"<meta name="wa-api-version" content="ab12cd34">"#), Some("ab12cd34"));
    }

    #[test]
    fn window_env_has_real_types_and_no_undefined_keys() {
        let c = Config::load(Env::new(
            [("SECRET_KEY", "s"), ("UPLOADER_URL", "/uploader"), ("ICON_URL", "/icon")]
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
        ))
        .unwrap();
        let env = front_env(&c);
        assert_eq!(env["MAX_PER_GROUP"], json!(4));
        assert_eq!(env["MINIMUM_DISTANCE"], json!(64));
        assert_eq!(env["ENABLE_CHAT"], json!(true));
        assert_eq!(env["LIVEKIT_PIXEL_DENSITY"], json!(2.0 / 3.0));
        assert!(env.get("JITSI_URL").is_none());
        assert!(page_script(&c).starts_with("window.env = {"));
    }
}
