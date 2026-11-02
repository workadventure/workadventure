//! The admin's answers, typed from the zod schemas the pusher and the back read them with
//! (tools/gen-admin-types.sh). An answer that does not fit is refused and logged, as zod's `parse` throws.

#[allow(clippy::all, clippy::pedantic)]
mod generated;

use serde::de::DeserializeOwned;
use serde_json::Value;

pub use generated::*;

/// `what`'s answer, if it has the contract's shape.
pub fn parse<T: DeserializeOwned>(what: &str, v: Value) -> Result<T, String> {
    serde_json::from_value(v).map_err(|e| {
        tracing::error!(%what, error = %e, "an answer of the admin does not fit the contract");
        format!("Invalid answer from the admin to {what}: {e}")
    })
}

/// Whether `v` has `T`'s shape, without keeping it (answers relayed to the front as they came).
pub fn fits<T: DeserializeOwned>(v: &Value) -> bool {
    T::deserialize(v).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn real_answers_fit_and_broken_ones_do_not() {
        let access = json!({
            "status": "ok", "email": null, "userUuid": "u", "tags": ["admin"], "visitCardUrl": null,
            "isCharacterTexturesValid": true, "characterTextures": [{"id": "w1", "url": "https://w/1.png"}],
            "isCompanionTextureValid": true, "world": "acme", "userRoomToken": "t", "canEdit": true,
            "messages": [], "anotherFieldTheAdminAdded": 1,
        });
        assert!(fits::<RoomAccess>(&access), "{:?}", serde_json::from_value::<RoomAccess>(access.clone()).err());
        let error = json!({"status": "error", "type": "error", "code": "USER_BANNED", "title": "Banned",
            "subtitle": "", "details": "You were banned", "image": ""});
        assert!(fits::<RoomAccess>(&error) && fits::<ErrorApiData>(&error));
        assert!(!fits::<RoomAccess>(&json!({"status": "ok"})));
        let rooms: Vec<ShortMapDescriptionListItem> =
            parse("sameWorld", json!([{"name": null, "roomUrl": "http://r", "description": "d"}])).unwrap();
        assert_eq!((rooms[0].name.as_deref(), rooms[0].room_url.as_str()), (None, "http://r"));
        assert!(parse::<LivekitCredentials>("livekit", json!({"livekitHost": "h"})).is_err());
        assert!(fits::<RoomRedirect>(&json!({"redirectUrl": "/x"})));
        // email and visitCardUrl may be null, not absent (z.string().nullable()).
        let minimal = json!({"status": "ok", "email": null, "visitCardUrl": null, "userUuid": "uuid-a", "tags": ["member"],
            "isCharacterTexturesValid": true, "characterTextures": [], "isCompanionTextureValid": true,
            "world": "acme", "userRoomToken": "", "canEdit": false});
        assert!(fits::<RoomAccess>(&minimal), "{:?}", serde_json::from_value::<RoomAccess>(minimal.clone()).err());
        let mut absent = minimal;
        absent.as_object_mut().unwrap().remove("visitCardUrl");
        assert!(!fits::<RoomAccess>(&absent));
    }
}
