//! A logged player's variables that persist (WA.player.state with persist): one Redis hash per player and room,
//! `pr_<uuid>_|@|_<roomUrl>`, each value `"<expiry ms or empty>:<1|0 public>:<json>"`
//! (RedisPlayersVariablesRepository). Anonymous players keep theirs in the browser.
//!
//! The world scope is `pw_<uuid>_|@|_<group>`, the group of the map details (the admin's world): without one,
//! world variables fall back to the room, as in the back.

use crate::redis_store::{RedisStore, now_ms};

pub fn key(uuid: &str, room_url: &str) -> String {
    format!("pr_{uuid}_|@|_{room_url}")
}

pub fn world_key(uuid: &str, world: &str) -> String {
    format!("pw_{uuid}_|@|_{world}")
}

/// A saved variable: value (JSON text), public, expiry (Unix ms).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Saved {
    pub value: String,
    pub public: bool,
    pub expires: Option<u64>,
}

pub fn encode(s: &Saved) -> String {
    let expires = s.expires.map_or(String::new(), |e| e.to_string());
    format!("{expires}:{}:{}", u8::from(s.public), s.value)
}

/// None for a malformed or expired entry (the back skips both).
pub fn decode(raw: &str, now: u64) -> Option<Saved> {
    let (expires, rest) = raw.split_once(':')?;
    let (public, value) = rest.split_once(':')?;
    let expires = if expires.is_empty() { None } else { Some(expires.parse::<u64>().ok()?) };
    let public = match public {
        "1" => true,
        "0" => false,
        _ => return None,
    };
    if expires.is_some_and(|e| e <= now) {
        return None;
    }
    Some(Saved { value: value.to_owned(), public, expires })
}

/// PLAYER_VARIABLES_MAX_TTL (seconds, -1 for none) caps a variable's TTL. The back takes the larger of the two,
/// so a script could keep a value longer than the limit; here the limit is a limit.
pub fn ttl(asked: Option<i32>, max: i64) -> Option<i64> {
    match (asked.map(i64::from), max) {
        (asked, max) if max < 0 => asked,
        (None, max) => Some(max),
        (Some(asked), max) => Some(asked.min(max)),
    }
}

/// What a player has saved in a room, and when the whole hash may go.
#[derive(Debug, Default)]
pub struct Mine {
    pub key: String,
    pub saved: Vec<(String, Saved)>,
}

impl Mine {
    pub async fn load(redis: &RedisStore, key: String) -> Self {
        let now = now_ms();
        let mut saved: Vec<(String, Saved)> =
            redis.hash(&key).await.into_iter().filter_map(|(name, raw)| Some((name, decode(&raw, now)?))).collect();
        saved.sort_by(|a, b| a.0.cmp(&b.0));
        Self { key, saved }
    }

    /// Saves one (an empty value removes it); the hash expires with its last variable when they all have one.
    pub fn save(&mut self, redis: &RedisStore, name: &str, value: &str, public: bool, ttl: Option<i64>) {
        self.saved.retain(|(n, _)| n != name);
        if value.is_empty() {
            redis.delete(&self.key, name);
        } else {
            let saved =
                Saved { value: value.to_owned(), public, expires: ttl.map(|t| now_ms() + t.max(0) as u64 * 1000) };
            redis.set(&self.key, name, &encode(&saved));
            self.saved.push((name.to_owned(), saved));
        }
        let expiries: Option<Vec<u64>> = self.saved.iter().map(|(_, s)| s.expires).collect();
        if let Some(last) = expiries.and_then(|e| e.into_iter().max()) {
            redis.expire_at(&self.key, last);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn saved_values_read_back_and_expired_or_broken_ones_are_dropped() {
        let s = Saved { value: "{\"a\":1}".into(), public: true, expires: Some(5000) };
        assert_eq!(encode(&s), "5000:1:{\"a\":1}");
        assert_eq!(decode(&encode(&s), 1000), Some(s.clone()));
        assert_eq!(decode(&encode(&s), 5000), None);
        assert_eq!(decode(":0:\"x:y\"", 0).unwrap().value, "\"x:y\"");
        assert_eq!(decode("abc:1:1", 0), None);
        assert_eq!(decode("1:2:1", 0), None);
        assert_eq!(ttl(None, -1), None);
        assert_eq!(ttl(Some(10), -1), Some(10));
        assert_eq!(ttl(None, 60), Some(60));
        assert_eq!(ttl(Some(3600), 60), Some(60));
        assert_eq!(key("u", "http://r"), "pr_u_|@|_http://r");
        assert_eq!(world_key("u", "acme"), "pw_u_|@|_acme");
    }
}
