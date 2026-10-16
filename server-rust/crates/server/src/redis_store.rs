//! Redis, as the back uses it (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD): hashes only. The room variables that
//! persist, one hash per room URL (RedisVariablesRepository); the player variables, one hash per player and room
//! (`pr_<uuid>_|@|_<roomUrl>`, RedisPlayersVariablesRepository). Without REDIS_HOST nothing is saved, as with
//! the back's Void repositories.
//!
//! A write is never awaited by a room. It waits here, the newest per field, and goes out when Redis answers: a
//! value set while Redis is down lands when it is back (node-redis queues its commands the same way), and a read
//! meanwhile sees it.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use redis::AsyncCommands;
use redis::aio::{ConnectionManager, ConnectionManagerConfig};

use crate::config::Config;

#[derive(Clone, PartialEq)]
enum Write {
    Set(String),
    Delete,
}

#[derive(Default)]
struct Pending {
    /// (key, field) -> what to do.
    fields: HashMap<(String, String), Write>,
    /// key -> when it expires (Unix ms).
    expires: HashMap<String, u64>,
}

pub struct RedisStore {
    conn: Option<ConnectionManager>,
    pending: parking_lot::Mutex<Pending>,
    wake: tokio::sync::Notify,
}

pub fn now_ms() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |d| d.as_millis() as u64)
}

impl RedisStore {
    /// Must run inside the runtime: the connection is made on first use, and remade after a failure.
    pub fn new(config: &Config) -> Arc<Self> {
        let conn = config.redis_host.as_ref().and_then(|host| {
            let password = config.redis_password.as_deref().map_or(String::new(), |p| format!(":{p}@"));
            let db = config.raw.get("REDIS_DB_NUMBER").filter(|d| !d.is_empty()).map_or(String::new(), |d| format!("/{d}"));
            let client = redis::Client::open(format!("redis://{password}{host}:{}{db}", config.redis_port))
                .inspect_err(|e| tracing::error!(error = %e, "invalid Redis address"))
                .ok()?;
            let settings = ConnectionManagerConfig::new()
                .set_connection_timeout(Some(Duration::from_secs(2)))
                .set_response_timeout(Some(Duration::from_secs(2)))
                .set_max_delay(Duration::from_secs(5));
            ConnectionManager::new_lazy_with_config(client, settings)
                .inspect_err(|e| tracing::error!(error = %e, "could not set up Redis"))
                .ok()
        });
        if conn.is_none() {
            tracing::warn!("REDIS_HOST is not set: no variables will be persisted");
        }
        let store = Arc::new(Self {
            conn,
            pending: parking_lot::Mutex::new(Pending::default()),
            wake: tokio::sync::Notify::new(),
        });
        if store.conn.is_some() {
            tokio::spawn(writer(store.clone()));
        }
        store
    }

    /// A hash, with the writes still waiting. If Redis cannot be read, those writes only.
    pub async fn hash(&self, key: &str) -> HashMap<String, String> {
        let Some(mut conn) = self.conn.clone() else { return HashMap::new() };
        let mut saved: HashMap<String, String> = conn.hgetall(key).await.unwrap_or_else(|e| {
            tracing::error!(%key, error = %e, "could not read from Redis");
            HashMap::new()
        });
        for ((k, field), write) in self.pending.lock().fields.iter() {
            if k == key {
                match write {
                    Write::Set(v) => saved.insert(field.clone(), v.clone()),
                    Write::Delete => saved.remove(field),
                };
            }
        }
        saved
    }

    fn queue(&self, key: &str, field: &str, write: Write) {
        if self.conn.is_none() {
            return;
        }
        self.pending.lock().fields.insert((key.to_owned(), field.to_owned()), write);
        self.wake.notify_one();
    }

    pub fn set(&self, key: &str, field: &str, value: &str) {
        self.queue(key, field, Write::Set(value.to_owned()));
    }

    pub fn delete(&self, key: &str, field: &str) {
        self.queue(key, field, Write::Delete);
    }

    /// The whole hash goes at `at_ms` (EXPIRE, sent after the writes before it).
    pub fn expire_at(&self, key: &str, at_ms: u64) {
        if self.conn.is_none() {
            return;
        }
        self.pending.lock().expires.insert(key.to_owned(), at_ms);
        self.wake.notify_one();
    }

    pub async fn room_variables(&self, room: &str) -> Vec<(String, String)> {
        self.hash(room).await.into_iter().collect()
    }

    pub fn save_room_variable(&self, room: &str, name: &str, value: &str) {
        self.set(room, name, value);
    }
}

async fn writer(store: Arc<RedisStore>) {
    let Some(mut conn) = store.conn.clone() else { return };
    let mut delay = Duration::from_millis(250);
    loop {
        let (fields, expires): (Vec<_>, Vec<_>) = {
            let p = store.pending.lock();
            (
                p.fields.iter().map(|(k, v)| (k.clone(), v.clone())).collect(),
                p.expires.iter().map(|(k, v)| (k.clone(), *v)).collect(),
            )
        };
        if fields.is_empty() && expires.is_empty() {
            store.wake.notified().await;
            continue;
        }
        let mut failed = false;
        for ((key, field), write) in fields {
            let sent: redis::RedisResult<()> = match &write {
                Write::Set(v) => conn.hset(&key, &field, v).await,
                Write::Delete => conn.hdel(&key, &field).await,
            };
            if let Err(e) = sent {
                tracing::error!(%key, %field, error = %e, "could not write to Redis, retrying");
                failed = true;
                break;
            }
            let mut p = store.pending.lock();
            // Unless it changed meanwhile: then the newer one goes next round.
            if p.fields.get(&(key.clone(), field.clone())) == Some(&write) {
                p.fields.remove(&(key, field));
            }
        }
        if !failed {
            for (key, at) in expires {
                let secs = at.saturating_sub(now_ms()).div_ceil(1000).max(1) as i64;
                if let Err(e) = conn.expire::<_, ()>(&key, secs).await {
                    tracing::error!(%key, error = %e, "could not set an expiry in Redis, retrying");
                    failed = true;
                    break;
                }
                let mut p = store.pending.lock();
                if p.expires.get(&key) == Some(&at) {
                    p.expires.remove(&key);
                }
            }
        }
        if failed {
            tokio::time::sleep(delay).await;
            delay = (delay * 2).min(Duration::from_secs(5));
        } else {
            delay = Duration::from_millis(250);
        }
    }
}
