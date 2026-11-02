//! `/ws/admin/rooms` (ADMIN_SOCKETS_TOKEN): the admin back-office's browser watches rooms and bans people.
//! Messages are JSON: `{event: "listen", roomIds, jwt}` and `{event: "banned", world, message: {userUuid,
//! message}, jwt}` in; `MemberJoin`, `MemberLeave` and `Error` out. The JWT, signed with ADMIN_SOCKETS_TOKEN,
//! lists the rooms it may watch (`authorizedRoomIds`).

use axum::extract::State;
use axum::extract::ws::{CloseFrame, Message, WebSocket, WebSocketUpgrade};
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};

use crate::AppState;
use crate::jwt;
use crate::room_actor::{self, RoomCmd};

pub async fn ws_admin_rooms(ws: WebSocketUpgrade, State(state): State<AppState>) -> Response {
    let Some(secret) = state.config.raw.get("ADMIN_SOCKETS_TOKEN").filter(|v| !v.is_empty()).cloned() else {
        return axum::http::StatusCode::NOT_FOUND.into_response();
    };
    ws.max_message_size(16 * 1024 * 1024).on_upgrade(move |socket| run(socket, state, secret))
}

async fn close(socket: &mut WebSocket, code: u16, error: &str, reason: &'static str) {
    let _ = socket.send(Message::Text(json!({"type": "Error", "data": {"message": error}}).to_string().into())).await;
    let _ = socket.send(Message::Close(Some(CloseFrame { code, reason: reason.into() }))).await;
}

async fn run(mut socket: WebSocket, state: AppState, secret: String) {
    let (tx, mut events) = tokio::sync::mpsc::channel::<String>(1000);
    // The rooms watched, kept alive while the socket is.
    let mut rooms = Vec::new();
    loop {
        tokio::select! {
            incoming = socket.recv() => {
                let text = match incoming {
                    Some(Ok(Message::Text(t))) => t.to_string(),
                    Some(Ok(Message::Binary(b))) => String::from_utf8_lossy(&b).into_owned(),
                    Some(Ok(Message::Close(_))) | None | Some(Err(_)) => return,
                    Some(Ok(_)) => continue,
                };
                let Ok(message) = serde_json::from_str::<Value>(&text) else {
                    return close(&mut socket, 1007, "Invalid message received! The connection has been closed.", "Invalid message received!").await;
                };
                let valid = message["jwt"].is_string()
                    && match message["event"].as_str() {
                        Some("listen") => message["roomIds"].as_array().is_some_and(|r| r.iter().all(Value::is_string)),
                        Some("banned") => message["world"].is_string() && message["message"]["userUuid"].is_string(),
                        _ => false,
                    };
                if !valid {
                    return close(&mut socket, 1007, "Invalid message received! The connection has been closed.", "Invalid message received!").await;
                }
                let Ok(claims) = jwt::open_unexpiring(&secret, message["jwt"].as_str().unwrap_or_default()) else {
                    return close(&mut socket, 1008, "Admin socket access refused! The connection has been closed.", "Access refused").await;
                };
                let authorized: Vec<&str> = claims["authorizedRoomIds"].as_array().into_iter().flatten().filter_map(Value::as_str).collect();
                if message["event"] == "listen" {
                    let asked: Vec<&str> = message["roomIds"].as_array().into_iter().flatten().filter_map(Value::as_str).collect();
                    let refused: Vec<&str> = asked.iter().copied().filter(|r| !authorized.contains(r)).collect();
                    if !refused.is_empty() {
                        let error = format!("Admin socket refused, listening of: {}", json!(refused));
                        return close(&mut socket, 1008, &error, "Access refused").await;
                    }
                    for room_id in asked {
                        let room = room_actor::get_or_spawn(&state, room_id);
                        let _ = room.send(RoomCmd::AdminListen { tx: tx.clone() }).await;
                        rooms.push(room);
                    }
                } else {
                    // Every authorized room of that world (the slug of /@/<org>/<world>/<room>).
                    let world = message["world"].as_str().unwrap_or_default();
                    let uuid = message["message"]["userUuid"].as_str().unwrap_or_default().to_owned();
                    let reason = message["message"]["message"].as_str().unwrap_or_default().to_owned();
                    for room_id in authorized.iter().filter(|r| r.split('/').nth(5) == Some(world)) {
                        if let Some(room) = state.rooms.get(room_id) {
                            let _ = room.send(RoomCmd::AdminBan { uuid: uuid.clone(), reason: reason.clone() }).await;
                        }
                    }
                }
            }
            Some(event) = events.recv() => {
                if socket.send(Message::Text(event.into())).await.is_err() {
                    return;
                }
            }
        }
    }
}
