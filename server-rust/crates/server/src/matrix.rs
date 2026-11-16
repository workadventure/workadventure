//! Synapse, as the pusher's MatrixProvider uses it: an admin session (MATRIX_ADMIN_USER / MATRIX_ADMIN_PASSWORD on
//! MATRIX_API_URI) that creates the chat rooms of the map's areas, invites players into them, makes the admins of
//! the world their moderators, and kicks those who leave.
//!
//! The admin's access token is shared by every server through Redis (`matrix-admin-access-token:<domain>:<user>`,
//! no expiry), behind a lock (`…-lock:…`, 30 s) so that only one of them logs in; a 401 or `M_UNKNOWN_TOKEN` drops
//! it and the request is tried once more with a new one.

use std::sync::Arc;
use std::time::{Duration, Instant};

use redis::AsyncCommands;
use redis::aio::ConnectionManager;
use serde_json::{Value, json};

use crate::config::Config;

const FOLDER: &str = "current-visited-room";

pub struct Matrix {
    /// MATRIX_API_URI, ending with exactly one `/`.
    api: String,
    domain: String,
    user: String,
    password: String,
    http: reqwest::Client,
    redis: Option<ConnectionManager>,
    token: tokio::sync::Mutex<Option<String>>,
    rate_limit_lifted: tokio::sync::OnceCell<()>,
    folder: tokio::sync::OnceCell<String>,
}

fn redis_key(domain: &str, user: &str) -> String {
    format!("matrix-admin-access-token:{domain}:{user}")
}

impl Matrix {
    /// None unless MATRIX_API_URI, MATRIX_ADMIN_USER, MATRIX_ADMIN_PASSWORD and MATRIX_DOMAIN are set.
    pub fn from_config(config: &Config, http: reqwest::Client) -> Option<Arc<Self>> {
        let get = |k: &str| config.raw.get(k).filter(|v| !v.is_empty()).cloned();
        Some(Arc::new(Self {
            api: format!("{}/", get("MATRIX_API_URI")?.trim_end_matches('/')),
            domain: get("MATRIX_DOMAIN")?,
            user: get("MATRIX_ADMIN_USER")?,
            password: get("MATRIX_ADMIN_PASSWORD")?,
            http,
            redis: crate::redis_store::connect(config, None),
            token: Default::default(),
            rate_limit_lifted: Default::default(),
            folder: Default::default(),
        }))
    }

    /// `@<MATRIX_ADMIN_USER>:<MATRIX_DOMAIN>`.
    pub fn admin_id(&self) -> String {
        format!("@{}:{}", self.user, self.domain)
    }

    async fn login(&self) -> Result<String, String> {
        let body = json!({"type": "m.login.password", "user": self.user, "password": self.password});
        let r = self.http.post(format!("{}_matrix/client/r0/login", self.api)).json(&body).send().await;
        let v: Value = r.map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;
        match v["access_token"].as_str() {
            Some(t) if v["errcode"].is_null() => Ok(t.to_owned()),
            _ => Err(format!("Failed with errcode {}", v["errcode"])),
        }
    }

    /// The admin's token: this process's, Redis's, or a new login under the lock.
    async fn access_token(&self) -> Result<String, String> {
        let mut mine = self.token.lock().await;
        if let Some(t) = mine.as_ref() {
            return Ok(t.clone());
        }
        let Some(mut redis) = self.redis.clone() else {
            let t = self.login().await?;
            *mine = Some(t.clone());
            return Ok(t);
        };
        let key = redis_key(&self.domain, &self.user);
        let lock = format!("matrix-admin-access-token-lock:{}:{}", self.domain, self.user);
        let me = format!("{}-{}", std::process::id(), uuid::Uuid::new_v4());
        let deadline = Instant::now() + Duration::from_secs(35);
        while Instant::now() < deadline {
            if let Ok(Some(t)) = redis.get::<_, Option<String>>(&key).await {
                *mine = Some(t.clone());
                return Ok(t);
            }
            let taken: Option<String> = redis::cmd("SET")
                .arg(&lock)
                .arg(&me)
                .arg("NX")
                .arg("EX")
                .arg(30)
                .query_async(&mut redis)
                .await
                .map_err(|e| e.to_string())?;
            if taken.is_some() {
                let found = redis.get::<_, Option<String>>(&key).await.ok().flatten();
                let result = match found {
                    Some(t) => Ok(t),
                    None => match self.login().await {
                        Ok(t) => redis.set::<_, _, ()>(&key, &t).await.map(|()| t).map_err(|e| e.to_string()),
                        Err(e) => Err(e),
                    },
                };
                if redis.get::<_, Option<String>>(&lock).await.ok().flatten().as_deref() == Some(me.as_str()) {
                    let _: Result<(), _> = redis.del(&lock).await;
                }
                let t = result?;
                *mine = Some(t.clone());
                return Ok(t);
            }
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
        Err("Timed out while waiting for the Matrix admin access token lock".into())
    }

    /// Forgets a token Synapse refused, here and in Redis (unless another server already replaced it).
    async fn invalidate(&self, bad: &str) {
        let mut mine = self.token.lock().await;
        if mine.as_deref() == Some(bad) {
            *mine = None;
        }
        if let Some(mut redis) = self.redis.clone() {
            let key = redis_key(&self.domain, &self.user);
            if redis.get::<_, Option<String>>(&key).await.ok().flatten().as_deref() == Some(bad) {
                let _: Result<(), _> = redis.del(&key).await;
            }
        }
    }

    /// An authenticated call; a refused token is replaced once. The answer's body, or an error with its status.
    async fn call(
        &self,
        method: reqwest::Method,
        path: &str,
        body: Option<&Value>,
    ) -> Result<Value, (Option<u16>, String)> {
        let mut retried = false;
        loop {
            let token = self.access_token().await.map_err(|e| (None, e))?;
            let mut request = self.http.request(method.clone(), format!("{}{path}", self.api)).bearer_auth(&token);
            if let Some(b) = body {
                request = request.json(b);
            }
            let r = request.timeout(Duration::from_secs(30)).send().await.map_err(|e| (None, e.to_string()))?;
            let status = r.status().as_u16();
            let v: Value = r.json().await.unwrap_or(Value::Null);
            if (status == 401 || v["errcode"] == "M_UNKNOWN_TOKEN") && !retried {
                retried = true;
                self.invalidate(&token).await;
                continue;
            }
            if status == 200 {
                return Ok(v);
            }
            return Err((Some(status), format!("{path}: {status} {}", v["error"].as_str().unwrap_or_default())));
        }
    }

    /// The admin account's rate limit lifted, once (ensureAdminRateLimitOverridden): 10 tries on a network error,
    /// a 429 or a 5xx, waiting the attempt in seconds (the pusher prefers Synapse's `retry_after_ms` when given).
    async fn lift_rate_limit(&self) -> Result<(), String> {
        self.rate_limit_lifted
            .get_or_try_init(|| async {
                let path = format!("_synapse/admin/v1/users/{}/override_ratelimit", self.admin_id());
                let body = json!({"message_per_second": 0, "burst_count": 0});
                let mut last = String::new();
                for attempt in 1..=10u64 {
                    match self.call(reqwest::Method::POST, &path, Some(&body)).await {
                        Ok(_) => return Ok(()),
                        Err((status, e)) if status.is_none_or(|s| s == 429 || s >= 500) => {
                            last = e;
                            tokio::time::sleep(Duration::from_millis(attempt * 1000)).await;
                        }
                        Err((_, e)) => return Err(e),
                    }
                }
                Err(last)
            })
            .await
            .map(drop)
            .inspect_err(|e| tracing::error!(error = %e, "Failed to override admin account ratelimit"))
    }

    async fn admin_call(&self, method: reqwest::Method, path: &str, body: Option<&Value>) -> Result<Value, String> {
        self.lift_rate_limit().await?;
        self.call(method, path, body).await.map_err(|(_, e)| e)
    }

    /// The space every area room belongs to (`#current-visited-room:<domain>`), found or created once.
    async fn folder(&self) -> Result<String, String> {
        self.folder
            .get_or_try_init(|| async {
                let alias = format!("_matrix/client/r0/directory/room/%23{FOLDER}:{}", self.domain);
                if let Ok(v) = self.admin_call(reqwest::Method::GET, &alias, None).await
                    && let Some(id) = v["room_id"].as_str()
                {
                    return Ok(id.to_owned());
                }
                tracing::info!("Failed to get chat folder area ID, creating one");
                let body = json!({"visibility": "public", "room_alias_name": FOLDER, "name": FOLDER,
                    "creation_content": {"type": "m.space"}});
                let v = self.admin_call(reqwest::Method::POST, "_matrix/client/r0/createRoom", Some(&body)).await?;
                v["room_id"].as_str().map(str::to_owned).ok_or_else(|| "no room_id".to_owned())
            })
            .await
            .cloned()
    }

    /// createRoomForArea: a private room, its history for those who joined, invitations for the admin only,
    /// in the areas' space.
    pub async fn create_room_for_area(&self) -> Result<String, String> {
        let folder = self.folder().await?;
        let body = json!({
            "visibility": "private",
            "initial_state": [
                {"type": "m.room.history_visibility", "content": {"history_visibility": "joined"}},
                {"type": "m.space.parent", "state_key": folder, "content": {"via": [self.domain]}},
            ],
            "power_level_content_override": {"invite": 100, "ban": 50, "kick": 50},
        });
        let v = self.admin_call(reqwest::Method::POST, "_matrix/client/r0/createRoom", Some(&body)).await?;
        let room = v["room_id"].as_str().ok_or("no room_id")?.to_owned();
        let child = format!("_matrix/client/r0/rooms/{folder}/state/m.space.child/{room}");
        self.admin_call(reqwest::Method::PUT, &child, Some(&json!({"via": [self.domain]})))
            .await
            .map_err(|e| format!("Failed to add room : {room} to room area folder: {e}"))?;
        Ok(room)
    }

    pub async fn invite(&self, user: &str, room: &str) -> Result<(), String> {
        let path = format!("_matrix/client/r0/rooms/{room}/invite");
        self.admin_call(reqwest::Method::POST, &path, Some(&json!({"user_id": user}))).await.map(drop)
    }

    /// Power level 50 (moderator), the others' levels kept.
    pub async fn promote(&self, user: &str, room: &str) -> Result<(), String> {
        let path = format!("_matrix/client/r0/rooms/{room}/state/m.room.power_levels");
        let mut levels = self.admin_call(reqwest::Method::GET, &path, None).await?;
        if !levels["users"].is_object() {
            levels["users"] = json!({});
        }
        levels["users"][user] = json!(50);
        self.admin_call(reqwest::Method::PUT, &path, Some(&levels)).await.map(drop)
    }

    pub async fn kick(&self, user: &str, room: &str) -> Result<(), String> {
        let path = format!("_matrix/client/r0/rooms/{room}/kick");
        self.admin_call(reqwest::Method::POST, &path, Some(&json!({"reason": "kick", "user_id": user}))).await.map(drop)
    }

    pub async fn rename(&self, room: &str, name: &str) -> Result<(), String> {
        let path = format!("_matrix/client/r0/rooms/{room}/state/m.room.name");
        self.admin_call(reqwest::Method::PUT, &path, Some(&json!({"name": name}))).await.map(drop)
    }

    /// deleteRoom: the members kicked, then the admin itself; the room stays in Synapse, empty. As the pusher's
    /// kickAllUsersFromRoom, only members who are not `join` are kicked (invited, left...); the admin leaving
    /// takes the room out of everyone's area list.
    pub async fn delete_room(&self, room: &str) -> Result<(), String> {
        let members =
            self.admin_call(reqwest::Method::GET, &format!("_matrix/client/r0/rooms/{room}/members"), None).await?;
        let admin = self.admin_id();
        let kicks = members["chunk"]
            .as_array()
            .into_iter()
            .flatten()
            .filter(|m| m["state_key"].as_str() != Some(admin.as_str()) && m["content"]["membership"] != "join")
            .filter_map(|m| m["state_key"].as_str().map(str::to_owned))
            .map(|user| async move {
                if let Err(e) = self.kick(&user, room).await {
                    tracing::warn!(%room, %user, error = %e, "Failed to kick all user");
                }
            });
        futures_util::future::join_all(kicks).await;
        self.kick(&admin, room).await
    }
}

/// The area's chat room property of the map editor (MatrixRoomPropertyData), the keys zod knows.
fn room_property(body: &Value) -> Option<Value> {
    let o = body.as_object()?;
    let text = |k: &str| o.get(k).and_then(Value::as_str);
    if o.get("type")?.as_str()? != "matrixRoomPropertyData" || !o.get("shouldOpenAutomatically")?.is_boolean() {
        return None;
    }
    let (id, name) = (text("id")?, text("displayName")?);
    let mut out = json!({"id": id, "type": "matrixRoomPropertyData", "shouldOpenAutomatically": o["shouldOpenAutomatically"],
        "displayName": name});
    for k in ["buttonLabel", "resourceUrl"] {
        match o.get(k) {
            None => {}
            Some(Value::String(v)) => out[k] = v.clone().into(),
            Some(_) => return None,
        }
    }
    match o.get("hideButtonLabel") {
        None => {}
        Some(Value::Bool(b)) => out["hideButtonLabel"] = (*b).into(),
        Some(_) => return None,
    }
    match o.get("serverData") {
        None => {}
        Some(Value::Object(d)) => match d.get("matrixRoomId") {
            None => out["serverData"] = json!({}),
            Some(Value::String(r)) => out["serverData"] = json!({"matrixRoomId": r}),
            Some(_) => return None,
        },
        Some(_) => return None,
    }
    Some(out)
}

/// The mapStorageToken middleware: `authorization` must be MAP_STORAGE_API_TOKEN, as it is.
fn refused(state: &crate::AppState, headers: &axum::http::HeaderMap) -> Option<axum::response::Response> {
    use axum::http::StatusCode;
    use axum::response::IntoResponse;
    let Some(expected) = state.config.raw.get("MAP_STORAGE_API_TOKEN").filter(|t| !t.is_empty()) else {
        return Some((StatusCode::UNAUTHORIZED, "No token configured!").into_response());
    };
    if headers.get(axum::http::header::AUTHORIZATION).and_then(|v| v.to_str().ok()) != Some(expected.as_str()) {
        tracing::error!("map-storage call to /roomArea refused: incorrect token");
        return Some((StatusCode::UNAUTHORIZED, "Incorrect token").into_response());
    }
    None
}

/// What `/roomArea` does with a property (MatrixRoomAreaController): POST creates the area's room and puts its id
/// in the property's server data (201 and the property), PATCH renames it (200), DELETE empties it (204).
pub async fn room_area_change(
    state: &crate::AppState,
    method: &axum::http::Method,
    body: &Value,
) -> (axum::http::StatusCode, Option<Value>, &'static str) {
    use axum::http::{Method, StatusCode};
    let Some(mut property) = room_property(body) else {
        let message = if *method == Method::POST { "Invalid Request Body" } else { "Invalid request body" };
        return (StatusCode::BAD_REQUEST, None, message);
    };
    let failed = |e: String| {
        tracing::error!(error = %e, "/roomArea failed");
        (StatusCode::INTERNAL_SERVER_ERROR, None, "Internal Server Error")
    };
    let Some(matrix) = state.matrix.clone() else { return failed("Matrix is not configured".into()) };
    let room = property["serverData"]["matrixRoomId"].as_str().map(str::to_owned);
    match *method {
        Method::POST => match matrix.create_room_for_area().await {
            Ok(id) => {
                property["serverData"] = json!({"matrixRoomId": id});
                (StatusCode::CREATED, Some(property), "")
            }
            Err(e) => failed(e),
        },
        Method::PATCH => match room {
            Some(room) => match matrix.rename(&room, property["displayName"].as_str().unwrap_or_default()).await {
                Ok(()) => (StatusCode::OK, None, "Room name updated successfully"),
                Err(e) => failed(e),
            },
            None => (StatusCode::OK, None, "Room name updated successfully"),
        },
        _ => match room {
            Some(room) => match matrix.delete_room(&room).await {
                Ok(()) => (StatusCode::NO_CONTENT, None, ""),
                Err(e) => failed(e),
            },
            None => (StatusCode::NO_CONTENT, None, ""),
        },
    }
}

async fn room_area(
    axum::extract::State(state): axum::extract::State<crate::AppState>,
    method: axum::http::Method,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> axum::response::Response {
    use axum::response::IntoResponse;
    if let Some(r) = refused(&state, &headers) {
        return r;
    }
    let body = serde_json::from_slice::<Value>(&body).unwrap_or(Value::Null);
    match room_area_change(&state, &method, &body).await {
        (status, Some(property), _) => (status, axum::Json(property)).into_response(),
        (status, None, text) => (status, text).into_response(),
    }
}

pub fn routes() -> axum::Router<crate::AppState> {
    axum::Router::new().route("/roomArea", axum::routing::post(room_area).patch(room_area).delete(room_area))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_area_room_property_keeps_the_keys_zod_knows() {
        let p = room_property(&json!({"id": "p1", "type": "matrixRoomPropertyData", "shouldOpenAutomatically": false,
            "displayName": "Lobby", "resourceUrl": "http://play/roomArea", "serverData": {"matrixRoomId": "!r:d"}, "extra": 1}))
        .unwrap();
        assert_eq!(p["serverData"]["matrixRoomId"], "!r:d");
        assert!(p.get("extra").is_none());
        assert!(
            room_property(&json!({"id": "p1", "type": "other", "shouldOpenAutomatically": false, "displayName": ""}))
                .is_none()
        );
        assert!(room_property(&json!({"id": "p1", "type": "matrixRoomPropertyData", "displayName": ""})).is_none());
    }
}
