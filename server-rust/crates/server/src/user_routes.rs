//! What the front saves of a logged user's choices (UserController: A9, A10, A11), and the Cloudflare challenge
//! of a white label host name (A4).

use axum::Router;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use serde_json::{Value, json};

use crate::AppState;
use crate::jwt;

pub fn routes() -> Router<AppState> {
    let ok = || async { "" };
    Router::new()
        .route("/save-name", post(save_name).options(ok))
        .route("/save-textures", post(save_textures).options(ok))
        .route("/save-companion-texture", post(save_companion).options(ok))
        .route("/.well-known/cf-custom-hostname-challenge/{*rest}", get(cf_challenge))
}

/// The `authenticated` middleware: the pusher's JWT in `Authorization`. Returns (identifier, logged).
fn authenticated(state: &AppState, headers: &HeaderMap) -> Result<(String, bool), &'static str> {
    let token = headers.get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()).ok_or("Missing authorization header")?;
    let claims = jwt::verify(&state.config.secret_key, token).map_err(|_| "Invalid token sent")?;
    Ok((claims.identifier, claims.access_token.is_some()))
}

/// Saved by the admin when it has the capability and the user is logged in; 204 otherwise too.
async fn save(state: &AppState, headers: &HeaderMap, body: &[u8], capability: &str, path: &str, field: (&str, &str)) -> Response {
    let (identifier, logged) = match authenticated(state, headers) {
        Ok(who) => who,
        Err(refused) => return (StatusCode::UNAUTHORIZED, refused).into_response(),
    };
    let Ok(body) = serde_json::from_slice::<Value>(body) else {
        return (StatusCode::BAD_REQUEST, "Invalid body").into_response();
    };
    let (Some(room), Some(value)) = (body["roomUrl"].as_str(), body.get(field.0)) else {
        return (StatusCode::BAD_REQUEST, axum::Json(json!([format!("Parameter {} or roomUrl: Required", field.0)]))).into_response();
    };
    if let Some(admin) = state.admin.as_ref().filter(|a| a.capabilities.get(capability).is_some())
        && logged
    {
        let sent = json!({"playUri": room, "userIdentifier": identifier, field.1: value});
        if let Err(e) = admin.save(path, sent).await {
            tracing::error!(error = %e, path, "the admin did not save");
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    }
    StatusCode::NO_CONTENT.into_response()
}

async fn save_name(State(state): State<AppState>, headers: HeaderMap, body: axum::body::Bytes) -> Response {
    save(&state, &headers, &body, "api/save-name", "/api/save-name", ("name", "name")).await
}

async fn save_textures(State(state): State<AppState>, headers: HeaderMap, body: axum::body::Bytes) -> Response {
    save(&state, &headers, &body, "api/save-textures", "/api/save-textures", ("textures", "textures")).await
}

/// No capability of its own: the textures' one.
async fn save_companion(State(state): State<AppState>, headers: HeaderMap, body: axum::body::Bytes) -> Response {
    save(&state, &headers, &body, "api/save-textures", "/api/save-companion-texture", ("texture", "texture")).await
}

/// A4. A workadventu.re host name never has one (notWaHost).
async fn cf_challenge(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let host = headers.get(header::HOST).and_then(|v| v.to_str().ok()).unwrap_or_default();
    let host = host.split(':').next().unwrap_or_default();
    if host.ends_with("workadventu.re") {
        return StatusCode::NOT_FOUND.into_response();
    }
    let Some(admin) = &state.admin else {
        return (StatusCode::from_u16(526).expect("valid"), "Fail on challenging hostname").into_response();
    };
    match admin.cf_challenge(host).await {
        Ok(text) => text.into_response(),
        Err(_) => (StatusCode::from_u16(526).expect("valid"), "Fail on challenging hostname").into_response(),
    }
}
