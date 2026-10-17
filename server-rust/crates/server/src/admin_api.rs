//! The remote admin (SaaS), when ADMIN_API_URL is set: the calls of the pusher, back and uploader to it, as
//! dev/contracts/admin-api.md lists them (A1…A24). Without it, LocalAdmin (local_admin.rs) answers instead.
//!
//! Most calls carry `Authorization: <ADMIN_API_TOKEN>` (raw); three go to the public ADMIN_URL (A16, A17, A18).
//! Business errors come as HTTP 200 with an ErrorApiData body; transport errors and non-2xx answers become an
//! ErrorApiData built here for A2 and A3, and errors for the others.

use std::sync::Arc;
use std::time::Duration;

use serde_json::{Value, json};

use crate::config::Config;

/// A timeout the TS calls do not have: an admin that stops answering must not hold a page or a socket forever.
const TIMEOUT: Duration = Duration::from_secs(30);

pub struct AdminApi {
    base: String,
    /// ADMIN_URL: the admin's public address.
    public: String,
    token: String,
    http: reqwest::Client,
    /// A1, read once at startup.
    pub capabilities: Value,
}

/// `{status:"error", type:"error", …}` built here (the pusher's ROOM_ACCESS_ERROR, MAP_VALIDATION…).
pub fn error_data(code: &str, title: &str, details: &str) -> Value {
    json!({
        "status": "error", "type": "error", "code": code, "title": title, "subtitle": "",
        "details": details, "image": "",
    })
}

/// Who asks A3 (fetchMemberDataByUuid).
pub struct RoomAccess<'a> {
    pub user_identifier: &'a str,
    pub play_uri: &'a str,
    pub ip_address: &'a str,
    pub character_texture_ids: &'a [String],
    pub companion_texture_id: Option<&'a str>,
    pub access_token: Option<&'a str>,
    pub chat_id: Option<&'a str>,
    pub locale: Option<&'a str>,
}

impl AdminApi {
    /// A1: waits for the capabilities, retrying every ADMIN_API_RETRY_DELAY ms (500) for as long as it takes, as the
    /// pusher and the back do before they listen. None without ADMIN_API_URL.
    pub async fn connect(config: &Config, http: reqwest::Client) -> Option<Arc<Self>> {
        let get = |k: &str| config.raw.get(k).filter(|v| !v.is_empty()).cloned();
        let base = get("ADMIN_API_URL")?.trim_end_matches('/').to_owned();
        let retry = Duration::from_millis(get("ADMIN_API_RETRY_DELAY").and_then(|v| v.parse().ok()).unwrap_or(500));
        let mut warned = false;
        let capabilities = loop {
            let asked = http.get(format!("{base}/api/capabilities")).timeout(TIMEOUT).send().await;
            match asked {
                Ok(r) if r.status().is_success() => match r.json::<Value>().await {
                    Ok(v) if v.is_object() => break v,
                    _ => {}
                },
                _ => {}
            }
            if !warned {
                tracing::warn!(%base, "the admin does not answer /api/capabilities yet, retrying");
                warned = true;
            }
            tokio::time::sleep(retry).await;
        };
        tracing::info!(%base, "connected to the admin");
        Some(Arc::new(Self {
            public: get("ADMIN_URL").unwrap_or_else(|| base.clone()).trim_end_matches('/').to_owned(),
            base,
            token: get("ADMIN_API_TOKEN").unwrap_or_default(),
            http,
            capabilities,
        }))
    }

    /// For tests: an admin at `base` with known capabilities.
    pub fn with(base: &str, token: &str, capabilities: Value, http: reqwest::Client) -> Arc<Self> {
        Arc::new(Self { base: base.into(), public: base.into(), token: token.into(), http, capabilities })
    }

    /// A capability is on at "v1".
    pub fn has(&self, capability: &str) -> bool {
        self.capabilities[capability] == "v1"
    }

    fn request(&self, method: reqwest::Method, url: String) -> reqwest::RequestBuilder {
        self.http.request(method, url).header("Authorization", &self.token).timeout(TIMEOUT)
    }

    fn api(&self, method: reqwest::Method, path: &str) -> reqwest::RequestBuilder {
        self.request(method, format!("{}{path}", self.base))
    }

    async fn json(builder: reqwest::RequestBuilder) -> Result<Value, String> {
        let r = builder.send().await.map_err(|e| e.to_string())?;
        let status = r.status();
        if !status.is_success() {
            return Err(format!("Request failed with status code {}", status.as_u16()));
        }
        r.json::<Value>().await.map_err(|e| e.to_string())
    }

    /// A2: the map of a room (MapDetailsData), a redirection (RoomRedirect) or an error, never a failure.
    pub async fn map_details(&self, play_uri: &str, user: Option<(&str, Option<&str>)>, locale: Option<&str>) -> Value {
        let mut query = vec![("playUri", play_uri.to_owned())];
        if let Some((id, token)) = user {
            query.push(("userId", id.to_owned()));
            if let Some(t) = token {
                query.push(("accessToken", t.to_owned()));
            }
        }
        let builder = self.api(reqwest::Method::GET, "/api/map").query(&query).header("Accept-Language", locale.unwrap_or("en"));
        match Self::json(builder).await {
            Ok(v) if v["redirectUrl"].is_string() || v["status"] == "error" || v.get("group").is_some() => v,
            Ok(v) => {
                tracing::error!(details = %v, "unexpected answer of the admin to /api/map");
                error_data("MAP_VALIDATION", "Invalid answer from the admin", "The map details sent by the admin are not valid")
            }
            Err(e) => error_data("ROOM_ACCESS_ERROR", "Cannot access the room", &e),
        }
    }

    /// A3: who the user is in this room (FetchMemberDataByUuidResponse), or an ErrorApiData.
    pub async fn room_access(&self, a: RoomAccess<'_>) -> Value {
        let mut query: Vec<(&str, String)> = vec![
            ("userIdentifier", a.user_identifier.to_owned()),
            ("playUri", a.play_uri.to_owned()),
            ("ipAddress", a.ip_address.to_owned()),
        ];
        for id in a.character_texture_ids {
            query.push(("characterTextureIds[]", id.clone()));
        }
        if let Some(c) = a.companion_texture_id {
            query.push(("companionTextureId", c.to_owned()));
        }
        if let Some(t) = a.access_token {
            query.push(("accessToken", t.to_owned()));
        }
        query.push(("isLogged", if a.access_token.is_some() { "1" } else { "0" }.to_owned()));
        if let Some(c) = a.chat_id {
            query.push(("chatID", c.to_owned()));
        }
        let builder = self
            .api(reqwest::Method::GET, "/api/room/access")
            .query(&query)
            .header("Accept-Language", a.locale.unwrap_or("en"));
        match Self::json(builder).await {
            Ok(v) if v["status"] == "ok" && v["userUuid"].is_string() && v["tags"].is_array() => v,
            Ok(v) if v["status"] == "error" || ["error", "retry", "redirect", "unauthorized"].iter().any(|t| v["type"] == *t) => v,
            Ok(v) => {
                tracing::error!(details = %v, "unexpected answer of the admin to /api/room/access");
                error_data("ROOM_ACCESS_VALIDATION", "Invalid answer from the admin", "The room access sent by the admin is not valid")
            }
            Err(e) => error_data("ROOM_ACCESS_ERROR", "Cannot access the room", &e),
        }
    }

    /// A4: the Cloudflare challenge of a custom host name (no token).
    pub async fn cf_challenge(&self, host: &str) -> Result<String, String> {
        let r = self.http.get(format!("{}/white-label/cf-challenge", self.base)).query(&[("host", host)]).timeout(TIMEOUT).send().await;
        match r {
            Ok(r) if r.status().is_success() => r.text().await.map_err(|e| e.to_string()),
            Ok(r) => Err(r.status().to_string()),
            Err(e) => Err(e.to_string()),
        }
    }

    /// A5: a report (the answer is ignored, errors swallowed by the caller).
    pub async fn report(&self, reported: &str, comment: &str, reporter: &str, room: &str) -> Result<(), String> {
        let body = json!({"reportedUserUuid": reported, "reportedUserComment": comment, "reporterUserUuid": reporter, "reportWorldSlug": room});
        let r = self.api(reqwest::Method::POST, "/api/report").header("Accept-Language", "en").json(&body).send().await;
        r.map_err(|e| e.to_string())?.error_for_status().map(drop).map_err(|e| e.to_string())
    }

    /// A6: the maps of the world.
    pub async fn rooms_from_same_world(&self, room: &str, tags: &[String], bypass: bool) -> Result<Value, String> {
        let query = [("roomUrl", room.to_owned()), ("bypassTagFilter", bypass.to_string()), ("tags", tags.join(","))];
        Self::json(self.api(reqwest::Method::GET, "/api/room/sameWorld").query(&query).header("Accept-Language", "en")).await
    }

    /// A7: true when the ban is stored, false when the admin refuses it.
    pub async fn ban(&self, uuid: &str, play_uri: &str, name: &str, message: &str, by: &str, ip: Option<&str>) -> Result<bool, String> {
        let mut body = json!({"uuidToBan": uuid, "playUri": play_uri, "name": name, "message": message, "byUserUuid": by});
        if let Some(ip) = ip {
            body["ipAddress"] = ip.into();
        }
        let v = Self::json(self.api(reqwest::Method::POST, "/api/ban").json(&body)).await.unwrap_or_else(|e| json!({"status": "error", "message": e}));
        Ok(v["status"] != "error")
    }

    /// A8: the tags used in the room ([] on any failure).
    pub async fn room_tags(&self, room: &str) -> Vec<String> {
        let v = Self::json(self.api(reqwest::Method::GET, "/api/room/tags").query(&[("roomUrl", room)])).await;
        v.ok().and_then(|v| serde_json::from_value(v).ok()).unwrap_or_default()
    }

    /// A9, A10, A11: saves of a logged user's choices; exactly 204 is a success.
    pub async fn save(&self, path: &str, body: Value) -> Result<(), String> {
        let r = self.api(reqwest::Method::POST, path).json(&body).send().await.map_err(|e| e.to_string())?;
        if r.status().as_u16() == 204 { Ok(()) } else { Err(format!("{path}: {}", r.status())) }
    }

    /// A12, A13, A14: lists of the world for a search.
    pub async fn search(&self, path: &str, play_uri: &str, text: &str) -> Result<Value, String> {
        Self::json(self.api(reqwest::Method::GET, path).query(&[("playUri", play_uri), ("searchText", text)])).await
    }

    /// A15: one member.
    pub async fn member(&self, uuid: &str) -> Result<Value, String> {
        Self::json(self.api(reqwest::Method::GET, &format!("/api/members/{uuid}"))).await
    }

    /// A16: the Matrix id of a member (on ADMIN_URL).
    pub async fn update_chat_id(&self, email: &str, chat_id: &str, room: &str) -> Result<(), String> {
        let body = json!({"chatId": chat_id, "userIdentifier": email, "roomUrl": room});
        let r = self.request(reqwest::Method::PUT, format!("{}/api/members/{email}/chatId", self.public)).json(&body).send().await;
        r.map_err(|e| e.to_string())?.error_for_status().map(drop).map_err(|e| e.to_string())
    }

    /// A17: a third-party token refreshed (on ADMIN_URL).
    pub async fn refresh_oauth_token(&self, token: &str, provider: Option<&str>, user: Option<&str>) -> Result<Value, String> {
        let body = json!({"accessToken": token, "provider": provider, "userIdentifier": user});
        let v = Self::json(self.request(reqwest::Method::POST, format!("{}/api/oauth/refreshtoken", self.public)).json(&body)).await?;
        if v["message"].is_string() && v["token"].is_string() { Ok(v) } else { Err("Invalid refresh token answer".into()) }
    }

    /// A18: the ICE servers of the user (on ADMIN_URL).
    pub async fn ice_servers(&self, room: &str, user: &str) -> Result<Value, String> {
        let url = format!("{}/api/ice-servers", self.public);
        Self::json(self.request(reqwest::Method::GET, url).query(&[("roomUrl", room), ("userIdentifier", user)])).await
    }

    /// A19, A20: the wokas or companions offered in a room.
    pub async fn list(&self, path: &str, room: &str, uuid: &str) -> Result<Value, String> {
        Self::json(self.api(reqwest::Method::GET, path).query(&[("roomUrl", room), ("uuid", uuid)])).await
    }

    /// A21: whether a playUri may receive the browser after a login or a logout.
    pub async fn verify_domain(&self, uri: &str) -> bool {
        let r = self.api(reqwest::Method::GET, "/api/domain/verify").query(&[("uri", uri)]).send().await;
        r.is_ok_and(|r| r.status().is_success())
    }

    /// A24: the LiveKit credentials of a room (capability api/livekit/credentials).
    pub async fn livekit_credentials(&self, play_uri: &str) -> Result<Value, String> {
        Self::json(self.api(reqwest::Method::GET, "/api/livekit/credentials").query(&[("playUri", play_uri)]).header("Accept", "application/json")).await
    }

    /// A23: the end of a recording, retried after 250 ms, 1 s and 4 s on a network error, 5xx, 408 or 429.
    pub async fn recording_ended(&self, payload: Value) {
        for delay in [0u64, 250, 1000, 4000] {
            tokio::time::sleep(Duration::from_millis(delay)).await;
            let r = self
                .api(reqwest::Method::POST, "/api/recordings/events")
                .header("Accept", "application/json")
                .timeout(Duration::from_secs(5))
                .json(&payload)
                .send()
                .await;
            match r {
                Ok(r) if r.status().is_success() => return,
                Ok(r) if !(r.status().is_server_error() || [408, 429].contains(&r.status().as_u16())) => {
                    tracing::error!(status = %r.status(), "the admin refused a recording event");
                    return;
                }
                Ok(_) | Err(_) => {}
            }
        }
        tracing::error!("the admin did not take a recording event");
    }
}
