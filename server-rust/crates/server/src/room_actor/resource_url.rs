//! map-storage's ResourceUrlModule: an area property with a `resourceUrl` (the chat room of an area) tells that
//! URL when it is added (POST, its answer replaces the property: that is how the room's id lands in the WAM),
//! changed (PATCH) or removed (DELETE). Only origins of WHITELISTED_RESOURCE_URLS and PUSHER_URL are called,
//! with MAP_STORAGE_API_TOKEN, 15 s each; a failure is logged and the edit goes on.
//!
//! The `/roomArea` of this very server is not called over HTTP: it is the same process.

use std::time::Duration;

use axum::http::Method;
use serde_json::Value;

use crate::AppState;

#[derive(Clone)]
pub(crate) struct ResourceUrl {
    app: AppState,
}

fn origin(url: &str) -> Option<String> {
    let u = reqwest::Url::parse(url).ok()?;
    Some(u.origin().ascii_serialization())
}

impl ResourceUrl {
    pub(crate) fn new(app: AppState) -> Self {
        Self { app }
    }

    fn own(&self, url: &str) -> bool {
        let pusher = self.app.config.raw.get("PUSHER_URL").and_then(|p| origin(p));
        origin(url).is_some_and(|o| Some(o) == pusher)
            && reqwest::Url::parse(url).is_ok_and(|u| u.path().trim_end_matches('/') == "/roomArea")
    }

    fn allowed(&self, url: &str) -> bool {
        let Some(o) = origin(url) else { return false };
        let raw = self.app.config.raw.get("WHITELISTED_RESOURCE_URLS").cloned().unwrap_or_default();
        let pusher = self.app.config.raw.get("PUSHER_URL").and_then(|p| origin(p));
        raw.split(',').filter_map(|u| origin(u.trim())).chain(pusher).any(|a| a == o)
    }

    /// The call; the answer's body when there is one.
    async fn call(&self, method: Method, property: &Value) -> Option<Value> {
        let url = property["resourceUrl"].as_str()?;
        if self.own(url) {
            return crate::matrix::room_area_change(&self.app, &method, property).await.1;
        }
        if !self.allowed(url) {
            tracing::error!(%url, "Unauthorized Resource URL");
            return None;
        }
        let token = self.app.config.raw.get("MAP_STORAGE_API_TOKEN").cloned().unwrap_or_default();
        let sent = self
            .app
            .http
            .request(method.clone(), url)
            .header(reqwest::header::AUTHORIZATION, token)
            .json(property)
            .timeout(Duration::from_secs(15))
            .send()
            .await
            .and_then(reqwest::Response::error_for_status);
        match sent {
            Ok(r) => r.json().await.ok(),
            Err(e) => {
                tracing::error!(%url, %method, error = %e, "Failed to execute a request on resourceUrl");
                None
            }
        }
    }

    /// A new property: its server data cleared, and the property the URL answers, if it is a valid one.
    pub(crate) async fn added(&self, mut property: Value) -> Value {
        if let Some(o) = property.as_object_mut() {
            o.remove("serverData");
        }
        self.answered(Method::POST, property).await
    }

    pub(crate) async fn changed(&self, property: Value) -> Value {
        self.answered(Method::PATCH, property).await
    }

    pub(crate) async fn removed(&self, property: &Value) {
        self.call(Method::DELETE, property).await;
    }

    async fn answered(&self, method: Method, property: Value) -> Value {
        match self.call(method, &property).await {
            Some(answer) if wa_core::wam_properties::check(&answer, false, "answer").is_ok() => answer,
            _ => property,
        }
    }
}

/// The properties with a resourceUrl that an area's change adds, changes (new value, position in `new`) and
/// removes, compared by id (UpdateAreaMapStorageCommand).
pub(crate) fn diff(old: &[Value], new: &[Value]) -> (Vec<usize>, Vec<usize>, Vec<Value>) {
    let has_url = |p: &Value| p["resourceUrl"].as_str().is_some_and(|u| !u.is_empty());
    let id = |p: &Value| p["id"].as_str().map(str::to_owned);
    let (mut added, mut changed) = (Vec::new(), Vec::new());
    for (i, p) in new.iter().enumerate() {
        match old.iter().find(|o| id(o).is_some() && id(o) == id(p)) {
            None if has_url(p) => added.push(i),
            Some(o) if o != p && has_url(p) => changed.push(i),
            _ => {}
        }
    }
    let removed = old.iter().filter(|o| has_url(o) && !new.iter().any(|p| id(p) == id(o))).cloned().collect();
    (added, changed, removed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn only_properties_with_a_resource_url_are_told() {
        let room = |id: &str, name: &str| json!({"id": id, "type": "matrixRoomPropertyData", "resourceUrl": "http://p/roomArea", "displayName": name});
        let plain = json!({"id": "s", "type": "silent"});
        let old = vec![room("a", "A"), room("b", "B"), plain.clone()];
        let new = vec![room("a", "A2"), plain, room("c", "C")];
        let (added, changed, removed) = diff(&old, &new);
        assert_eq!((added, changed), (vec![2], vec![0]));
        assert_eq!(removed, vec![room("b", "B")]);
    }
}

#[cfg(test)]
mod answer {
    #[test]
    fn the_answer_of_room_area_is_a_valid_area_property() {
        let p = serde_json::json!({"id": "p1", "type": "matrixRoomPropertyData", "shouldOpenAutomatically": false,
            "displayName": "Lobby", "resourceUrl": "http://p/roomArea", "serverData": {"matrixRoomId": "!r:d"}});
        assert_eq!(wa_core::wam_properties::check(&p, false, "answer"), Ok(()));
    }
}
