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
        .route("/room/refresh", post(room_refresh))
        .route("/message", post(message))
        .route("/external-module/event", post(external_module_event))
}

/// The adminToken middleware: `admin-token` (deprecated) or `Authorization` must be ADMIN_API_TOKEN.
fn refused(state: &AppState, headers: &HeaderMap) -> Option<Response> {
    let Some(expected) = state.config.raw.get("ADMIN_API_TOKEN").filter(|t| !t.is_empty()) else {
        return Some((StatusCode::UNAUTHORIZED, "No token configured!").into_response());
    };
    let token = headers.get("admin-token").or_else(|| headers.get(header::AUTHORIZATION)).and_then(|v| v.to_str().ok());
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

/// A room of this server, if it runs (the back answers nothing for a room it does not hold).
async fn to_room(state: &AppState, room: &str, cmd: RoomCmd) {
    if let Some(actor) = state.rooms.get(room) {
        let _ = actor.send(cmd).await;
    }
}

fn json_body(body: &[u8]) -> Option<serde_json::Value> {
    serde_json::from_slice(body).ok()
}

/// `POST /room/refresh {roomId}`: the users of the room reload it.
async fn room_refresh(State(state): State<AppState>, headers: HeaderMap, body: axum::body::Bytes) -> Response {
    if let Some(r) = refused(&state, &headers) {
        return r;
    }
    let Some(body) = json_body(&body) else {
        return (StatusCode::BAD_REQUEST, "Invalid JSON body").into_response();
    };
    let Some(room) = body["roomId"].as_str() else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Incorrect roomId parameter").into_response();
    };
    to_room(&state, room, RoomCmd::Refresh).await;
    "ok".into_response()
}

/// `POST /message {text, type: message | capacity, targets}`: an admin message, or the world-full warning.
async fn message(State(state): State<AppState>, headers: HeaderMap, body: axum::body::Bytes) -> Response {
    if let Some(r) = refused(&state, &headers) {
        return r;
    }
    let Some(body) = json_body(&body) else {
        return (StatusCode::BAD_REQUEST, "Invalid JSON body").into_response();
    };
    let (Some(text), Some(kind), Some(targets)) =
        (body["text"].as_str(), body["type"].as_str(), body["targets"].as_array())
    else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Incorrect text, type or targets parameter").into_response();
    };
    if kind != "message" && kind != "capacity" {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Incorrect type parameter").into_response();
    }
    for room in targets.iter().filter_map(|t| t.as_str()) {
        let cmd = if kind == "message" {
            RoomCmd::AdminMessage { kind: String::new(), message: text.to_owned() }
        } else {
            RoomCmd::WorldFull
        };
        to_room(&state, room, cmd).await;
    }
    "ok".into_response()
}

/// `POST /external-module/event {data: {roomId, moduleId, recipientUuid, message}}`: to one user of a room.
async fn external_module_event(State(state): State<AppState>, headers: HeaderMap, body: axum::body::Bytes) -> Response {
    if let Some(r) = refused(&state, &headers) {
        return r;
    }
    let Some(body) = json_body(&body) else {
        return (StatusCode::BAD_REQUEST, "Invalid JSON body").into_response();
    };
    let d = &body["data"];
    let (Some(room), Some(module), Some(recipient)) =
        (d["roomId"].as_str(), d["moduleId"].as_str(), d["recipientUuid"].as_str())
    else {
        return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"cause": "Incorrect parameters"})))
            .into_response();
    };
    if !d["message"].is_object() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(serde_json::json!({"cause": "Incorrect message parameter"})),
        )
            .into_response();
    }
    let message = wa_proto::messages::ExternalModuleMessage {
        module_id: module.to_owned(),
        recipient_uuid: Some(recipient.to_owned()),
        room_id: Some(room.to_owned()),
        message: Some(crate::wire::json_to(&d["message"])),
    };
    to_room(&state, room, RoomCmd::ExternalModule(message)).await;
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
    let (Some(space), Some(session_id)) =
        (q.space.filter(|s| !s.is_empty()), q.recording_session_id.filter(|s| !s.is_empty()))
    else {
        return (StatusCode::BAD_REQUEST, "space and recordingSessionId are required").into_response();
    };
    if body.is_empty() {
        return (StatusCode::BAD_REQUEST, "Invalid request body").into_response();
    }
    let auth = headers
        .get(header::AUTHORIZATION)
        .or_else(|| headers.get("authorize"))
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default()
        .to_owned();
    tracing::info!(%space, %session_id, "egress webhook");
    // The space checks it, with the credentials it records with (the admin's, per world, or the server's).
    let Some(actor) = state.spaces.get(&space) else { return StatusCode::NO_CONTENT.into_response() };
    let (reply, answer) = tokio::sync::oneshot::channel();
    let cmd = crate::space_actor::SpaceCmd::Egress { session_id, auth, body, reply };
    if actor.send(cmd).await.is_err() {
        return StatusCode::NO_CONTENT.into_response();
    }
    let status = answer.await.unwrap_or(StatusCode::NO_CONTENT);
    status.into_response()
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
