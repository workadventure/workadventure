//! LiveKit, as the back's LiveKitService uses it, with LiveKit's Rust server SDK (`livekit-api`): participant
//! tokens, rooms, egress and webhooks. Credentials come from LIVEKIT_HOST, LIVEKIT_API_KEY and LIVEKIT_API_SECRET,
//! or from the admin (A24).
//!
//! One call does not go through the SDK's client: its `start_room_composite_egress` builds the request itself and
//! leaves out the egress's own webhook, which the back sets (it is how this server hears that a recording ended).
//! That request is the SDK's type, sent the same way (Twirp, protobuf, a token with `roomRecord`).

use std::time::Duration;

use livekit_api::access_token::{AccessToken, TokenVerifier, VideoGrants};
use livekit_api::services::egress::EgressClient;
use livekit_api::services::room::{CreateRoomOptions, RoomClient};
use livekit_api::webhooks::WebhookReceiver;
use livekit_protocol as proto;
use prost::Message;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

use crate::config::Config;

/// The SDK's default validity of a participant token, as the back's.
const TOKEN_TTL: Duration = Duration::from_secs(6 * 3600);

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
        let grants = VideoGrants {
            room: room.to_owned(),
            room_join: true,
            can_publish: Some(true),
            can_subscribe: Some(true),
            can_publish_sources: ["camera", "microphone", "screen_share", "screen_share_audio"]
                .map(str::to_owned)
                .to_vec(),
            ..VideoGrants::default()
        };
        AccessToken::with_api_key(&self.key, &self.secret)
            .with_identity(identity)
            .with_name(name)
            .with_metadata(&json!({"userId": identity, "uuid": uuid}).to_string())
            .with_ttl(TOKEN_TTL)
            .with_grants(grants)
            .to_jwt()
            .unwrap_or_else(|e| {
                tracing::error!(error = %e, "could not sign a LiveKit token");
                String::new()
            })
    }

    fn rooms(&self) -> RoomClient {
        RoomClient::with_api_key(&self.host, &self.key, &self.secret)
    }

    /// createRoom: the room, unless it is already there (no options: the server's defaults apply).
    pub async fn create_room(&self, room: &str) -> Result<(), String> {
        let rooms = self.rooms();
        if !rooms.list_rooms(vec![room.to_owned()]).await.map_err(|e| e.to_string())?.is_empty() {
            return Ok(());
        }
        rooms.create_room(room, CreateRoomOptions::default()).await.map(drop).map_err(|e| e.to_string())
    }

    pub async fn delete_room(&self, room: &str) -> Result<(), String> {
        self.rooms().delete_room(room).await.map_err(|e| e.to_string())
    }

    pub async fn stop_egress(&self, egress_id: &str) -> Result<(), String> {
        EgressClient::with_api_key(&self.host, &self.key, &self.secret)
            .stop_egress(egress_id)
            .await
            .map(drop)
            .map_err(|e| e.to_string())
    }

    /// Egress.StartRoomCompositeEgress with the request as the back builds it (webhook included): the egress id.
    pub async fn start_composite_egress(
        &self,
        http: &reqwest::Client,
        request: proto::RoomCompositeEgressRequest,
    ) -> Result<String, String> {
        let token = AccessToken::with_api_key(&self.key, &self.secret)
            .with_grants(VideoGrants { room_record: true, ..VideoGrants::default() })
            .with_ttl(Duration::from_secs(600))
            .to_jwt()
            .map_err(|e| e.to_string())?;
        let response = http
            .post(format!("{}/twirp/livekit.Egress/StartRoomCompositeEgress", self.host))
            .bearer_auth(token)
            .header(reqwest::header::CONTENT_TYPE, "application/protobuf")
            .body(request.encode_to_vec())
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let status = response.status();
        let body = response.bytes().await.map_err(|e| e.to_string())?;
        if !status.is_success() {
            let message: Value = serde_json::from_slice(&body).unwrap_or_default();
            return Err(format!("StartRoomCompositeEgress: {status} {}", message["msg"].as_str().unwrap_or_default()));
        }
        let info = proto::EgressInfo::decode(body).map_err(|e| e.to_string())?;
        Ok(info.egress_id).and_then(|id| if id.is_empty() { Err("no egress id".into()) } else { Ok(id) })
    }
}

/// LIVEKIT_RECORDING_S3_*: where the egress writes (path-style, as for rustfs or MinIO).
pub fn s3_upload(config: &Config) -> proto::S3Upload {
    let get = |k: &str| config.raw.get(&format!("LIVEKIT_RECORDING_S3_{k}")).cloned().unwrap_or_default();
    proto::S3Upload {
        access_key: get("ACCESS_KEY"),
        secret: get("SECRET_KEY"),
        region: get("REGION"),
        endpoint: get("ENDPOINT"),
        bucket: get("BUCKET"),
        force_path_style: true,
        ..proto::S3Upload::default()
    }
}

/// LiveKitService.startRecording: a grid of the room to `<uuid>/recording-<UTC time>.mp4`, a thumbnail every
/// 10 s, and the egress events sent to PLAY_URL for this recording session.
pub fn composite_egress(
    room: &str,
    folder: &str,
    timestamp: &str,
    webhook: &str,
    signing_key: &str,
    s3: proto::S3Upload,
) -> proto::RoomCompositeEgressRequest {
    proto::RoomCompositeEgressRequest {
        room_name: room.to_owned(),
        layout: "grid".to_owned(),
        file_outputs: vec![proto::EncodedFileOutput {
            file_type: proto::EncodedFileType::Mp4 as i32,
            filepath: format!("{folder}/recording-{timestamp}"),
            disable_manifest: true,
            output: Some(proto::encoded_file_output::Output::S3(s3.clone())),
        }],
        image_outputs: vec![proto::ImageOutput {
            capture_interval: 10,
            width: 320,
            height: 180,
            filename_prefix: format!("{folder}/thumbnail-{timestamp}"),
            output: Some(proto::image_output::Output::S3(s3)),
            ..proto::ImageOutput::default()
        }],
        webhooks: vec![proto::WebhookConfig {
            url: webhook.to_owned(),
            signing_key: signing_key.to_owned(),
            ..proto::WebhookConfig::default()
        }],
        ..proto::RoomCompositeEgressRequest::default()
    }
}

/// A field of a LiveKit JSON answer, in either of protojson's spellings.
pub fn field<'a>(v: &'a Value, camel: &str, snake: &str) -> &'a Value {
    if v.get(camel).is_some() { &v[camel] } else { &v[snake] }
}

/// WebhookReceiver.receive (the SDK's): a token of our key, signed with our secret, over the exact body. The
/// event as JSON (protojson: camelCase, 64-bit numbers as strings).
pub fn verify_webhook(lk: &Livekit, authorization: &str, body: &[u8]) -> Result<Value, String> {
    let token = authorization.trim_start_matches("Bearer ").trim();
    let body = std::str::from_utf8(body).map_err(|_| "invalid body".to_owned())?;
    let event = WebhookReceiver::new(TokenVerifier::with_api_key(&lk.key, &lk.secret))
        .receive(body, token)
        .map_err(|e| e.to_string())?;
    serde_json::to_value(event).map_err(|e| e.to_string())
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
    use crate::jwt;

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

    #[test]
    fn a_webhook_is_taken_only_signed_with_our_secret_over_the_exact_body() {
        use base64::Engine;
        let lk = Livekit { host: "https://lk.example".into(), key: "devkey".into(), secret: "s".repeat(32) };
        let body = br#"{"event":"egress_started","egressInfo":{"egressId":"EG_1","roomName":"world.space","startedAt":"1760000000000000000"}}"#;
        let sha = base64::engine::general_purpose::STANDARD.encode(Sha256::digest(body));
        let sign = |secret: &str| {
            jwt::sign(
                secret,
                &json!({"iss": "devkey", "sha256": sha, "exp": jwt::now_secs() + 60, "nbf": jwt::now_secs()}),
            )
        };
        let event = verify_webhook(&lk, &sign(&lk.secret), body).unwrap();
        assert_eq!(field(&event, "egressInfo", "egress_info")["egressId"], "EG_1");
        assert!(verify_webhook(&lk, &sign(&lk.secret), b"{}").is_err());
        assert!(verify_webhook(&lk, &sign(&"o".repeat(32)), body).is_err());
    }

    #[test]
    fn a_recording_asks_for_a_grid_its_thumbnails_and_its_own_webhook() {
        let r = composite_egress(
            "room",
            "uuid",
            "2026-10-17T09:15:11",
            "http://play/hook",
            "devkey",
            proto::S3Upload::default(),
        );
        assert_eq!(
            (r.layout.as_str(), r.file_outputs[0].filepath.as_str()),
            ("grid", "uuid/recording-2026-10-17T09:15:11")
        );
        assert_eq!(r.image_outputs[0].capture_interval, 10);
        assert_eq!((r.webhooks[0].url.as_str(), r.webhooks[0].signing_key.as_str()), ("http://play/hook", "devkey"));
    }
}
