//! What the admin calls on the pusher with ADMIN_API_TOKEN (AdminController).

use std::time::Duration;

use axum::Router;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};

use crate::AppState;
use crate::room_actor::RoomCmd;

pub fn routes() -> Router<AppState> {
    Router::new().route("/rooms", get(rooms)).route("/global/event", post(global_event))
}

/// The adminToken middleware: `admin-token` (deprecated) or `Authorization` must be ADMIN_API_TOKEN.
fn refused(state: &AppState, headers: &HeaderMap) -> Option<Response> {
    let Some(expected) = state.config.raw.get("ADMIN_API_TOKEN").filter(|t| !t.is_empty()) else {
        return Some((StatusCode::UNAUTHORIZED, "No token configured!").into_response());
    };
    let token = headers
        .get("admin-token")
        .or_else(|| headers.get(header::AUTHORIZATION))
        .and_then(|v| v.to_str().ok());
    if token != Some(expected.as_str()) {
        tracing::error!("admin access refused");
        return Some((StatusCode::UNAUTHORIZED, "Incorrect token").into_response());
    }
    None
}

#[derive(serde::Deserialize)]
struct GlobalEvent {
    name: String,
    data: Option<serde_json::Value>,
}

/// `POST /global/event` `{name, data?}`: the event to every room, as if from the Room API (no sender).
async fn global_event(State(state): State<AppState>, headers: HeaderMap, body: axum::body::Bytes) -> Response {
    if let Some(r) = refused(&state, &headers) {
        return r;
    }
    let Ok(event) = serde_json::from_slice::<GlobalEvent>(&body) else {
        return (StatusCode::BAD_REQUEST, "Invalid body: {name: string, data?: unknown}").into_response();
    };
    let data = event.data.as_ref().map(crate::wire::json_to);
    for room in state.rooms.live() {
        let cmd = RoomCmd::Event { sender: None, name: event.name.clone(), data: data.clone(), targets: Vec::new() };
        let _ = tokio::time::timeout(Duration::from_secs(1), room.send(cmd)).await;
    }
    "ok".into_response()
}

/// `GET /rooms`: `{roomUrl: users}` for every room; a room that does not answer within a second is left out.
async fn rooms(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if let Some(r) = refused(&state, &headers) {
        return r;
    }
    let asks = state.rooms.live().into_iter().map(|room| async move {
        let (reply, answer) = tokio::sync::oneshot::channel();
        room.send(RoomCmd::Describe { reply }).await.ok()?;
        tokio::time::timeout(Duration::from_secs(1), answer).await.ok()?.ok()
    });
    let rooms: serde_json::Map<String, serde_json::Value> =
        futures_util::future::join_all(asks).await.into_iter().flatten().map(|(url, n)| (url, n.into())).collect();
    axum::Json(rooms).into_response()
}
