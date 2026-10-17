//! LiveKit, as the back's LiveKitService uses it: participant tokens, and the server API over Twirp (JSON) for
//! rooms and egress, each call signed with a short-lived management token. Credentials come from LIVEKIT_HOST,
//! LIVEKIT_API_KEY and LIVEKIT_API_SECRET.

use std::time::Duration;

use serde_json::{Value, json};
use sha2::{Digest, Sha256};

use crate::config::Config;
use crate::jwt;

/// The SDK's default validity of a participant token.
const TOKEN_TTL_SECS: u64 = 6 * 3600;

#[derive(Clone, Debug)]
pub struct Livekit {
    pub host: String,
    pub key: String,
    pub secret: String,
}

impl Livekit {
    /// None unless all three variables are set (LivekitAvailabilityService).
    pub fn from_config(config: &Config) -> Option<Self> {
        let get = |k: &str| config.raw.get(k).filter(|v| !v.is_empty()).cloned();
        Some(Self {
            host: get("LIVEKIT_HOST")?.trim_end_matches('/').to_owned(),
            key: get("LIVEKIT_API_KEY")?,
            secret: get("LIVEKIT_API_SECRET")?,
        })
    }

    /// What the client connects to: the host with `ws` for `http` (`wss` for `https`).
    pub fn server_url(&self) -> String {
        self.host.replacen("http", "ws", 1)
    }

    /// LiveKitService.generateToken: join, publish (camera, microphone, screen and its sound), subscribe.
    pub fn participant_token(&self, room: &str, identity: &str, name: &str, uuid: &str) -> String {
        let now = jwt::now_secs();
        let claims = json!({
            "iss": self.key,
            "sub": identity,
            "jti": identity,
            "name": name,
            "metadata": json!({"userId": identity, "uuid": uuid}).to_string(),
            "nbf": now,
            "exp": now + TOKEN_TTL_SECS,
            "video": {
                "room": room,
                "roomJoin": true,
                "canPublish": true,
                "canSubscribe": true,
                "canPublishSources": ["camera", "microphone", "screen_share", "screen_share_audio"],
            },
        });
        jwt::sign(&self.secret, &claims)
    }

    fn management_token(&self, video: Value) -> String {
        let now = jwt::now_secs();
        jwt::sign(&self.secret, &json!({"iss": self.key, "nbf": now, "exp": now + 600, "video": video}))
    }

    async fn twirp(&self, http: &reqwest::Client, method: &str, video: Value, body: Value) -> Result<Value, String> {
        let response = http
            .post(format!("{}/twirp/livekit.{method}", self.host))
            .bearer_auth(self.management_token(video))
            .json(&body)
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let status = response.status();
        let body: Value = response.json().await.unwrap_or(Value::Null);
        if status.is_success() {
            Ok(body)
        } else {
            Err(format!("{method}: {status} {}", body["msg"].as_str().unwrap_or_default()))
        }
    }

    /// createRoom: the room, unless it is already there (no options: the server's defaults apply).
    pub async fn create_room(&self, http: &reqwest::Client, room: &str) -> Result<(), String> {
        let listed = self.twirp(http, "RoomService/ListRooms", json!({"roomList": true}), json!({"names": [room]})).await?;
        if listed["rooms"].as_array().is_some_and(|r| !r.is_empty()) {
            return Ok(());
        }
        self.twirp(http, "RoomService/CreateRoom", json!({"roomCreate": true}), json!({"name": room})).await.map(drop)
    }

    pub async fn delete_room(&self, http: &reqwest::Client, room: &str) -> Result<(), String> {
        self.twirp(http, "RoomService/DeleteRoom", json!({"roomCreate": true}), json!({"room": room})).await.map(drop)
    }

    /// Egress/StartRoomCompositeEgress or any other egress call.
    pub async fn egress(&self, http: &reqwest::Client, method: &str, body: Value) -> Result<Value, String> {
        self.twirp(http, &format!("Egress/{method}"), json!({"roomRecord": true}), body).await
    }
}

/// getLivekitRoomName: the space name, or its SHA-256 when it is longer than LiveKit allows.
pub fn room_name(space: &str) -> String {
    if space.len() <= 250 {
        space.to_owned()
    } else {
        Sha256::digest(space.as_bytes()).iter().map(|b| format!("{b:02x}")).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_participant_token_lets_one_user_into_one_room() {
        let lk = Livekit { host: "https://lk.example".into(), key: "devkey".into(), secret: "s".repeat(32) };
        assert_eq!(lk.server_url(), "wss://lk.example");
        let token = lk.participant_token("world.space", "room_7", "Alice", "u-1");
        let claims = jwt::open(&lk.secret, &token).unwrap();
        assert_eq!(claims["iss"], "devkey");
        assert_eq!(claims["sub"], "room_7");
        assert_eq!(claims["video"]["room"], "world.space");
        assert_eq!(claims["video"]["canPublishSources"][2], "screen_share");
        let metadata: Value = serde_json::from_str(claims["metadata"].as_str().unwrap()).unwrap();
        assert_eq!(metadata, json!({"userId": "room_7", "uuid": "u-1"}));
        assert_eq!(room_name("short"), "short");
        assert_eq!(room_name(&"x".repeat(300)).len(), 64);
    }
}
