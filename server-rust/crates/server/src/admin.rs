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
    Router::new()
        .route("/rooms", get(rooms))
        .route("/global/event", post(global_event))
        .route("/livekit/egress/webhook", post(egress_webhook))
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

#[derive(serde::Deserialize)]
struct EgressQuery {
    space: Option<String>,
    #[serde(rename = "recordingSessionId")]
    recording_session_id: Option<String>,
}

/// `POST /livekit/egress/webhook?space=&recordingSessionId=`: LiveKit's egress events for a recording, signed
/// with our key. Only the start and the end of an egress matter; a recording of a space no longer here is
/// ignored (204), as an unknown session is.
async fn egress_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Query(q): axum::extract::Query<EgressQuery>,
    body: axum::body::Bytes,
) -> Response {
    let (Some(space), Some(session_id)) = (q.space.filter(|s| !s.is_empty()), q.recording_session_id.filter(|s| !s.is_empty())) else {
        return (StatusCode::BAD_REQUEST, "space and recordingSessionId are required").into_response();
    };
    if body.is_empty() {
        return (StatusCode::BAD_REQUEST, "Invalid request body").into_response();
    }
    let Some(lk) = crate::livekit::Livekit::from_config(&state.config) else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "LiveKit is not configured").into_response();
    };
    let auth = headers
        .get(header::AUTHORIZATION)
        .or_else(|| headers.get("authorize"))
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    let event = match crate::livekit::verify_webhook(&lk, auth, &body) {
        Ok(event) => event,
        Err(e) if e == "invalid body" => return (StatusCode::BAD_REQUEST, e).into_response(),
        Err(e) => return (StatusCode::UNAUTHORIZED, e).into_response(),
    };
    let ended = match event["event"].as_str() {
        Some("egress_started") => false,
        Some("egress_ended") => true,
        _ => return StatusCode::NO_CONTENT.into_response(),
    };
    let info = crate::livekit::field(&event, "egressInfo", "egress_info");
    let Some(egress_id) = crate::livekit::field(info, "egressId", "egress_id").as_str().map(str::to_owned) else {
        return (StatusCode::BAD_REQUEST, "egressInfo.egressId is required").into_response();
    };
    tracing::info!(%space, %session_id, %egress_id, ended, "egress webhook");
    if let Some(actor) = state.spaces.get(&space) {
        let _ = actor.send(crate::space_actor::SpaceCmd::Egress { session_id, egress_id, ended }).await;
    }
    StatusCode::NO_CONTENT.into_response()
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
