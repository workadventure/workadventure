//! Configuration, read from the environment variables of the four TypeScript services (pusher, back,
//! map-storage, uploader), with the same names and defaults. Variables that only made sense between those
//! services (API_URL, GRPC_PORT...) are accepted and ignored.

use std::collections::HashMap;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Config {
    // --- HTTP ---
    /// SERVER_HTTP_PORT or PUSHER_HTTP_PORT: the single HTTP/WebSocket port.
    pub http_port: u16,
    /// PROMETHEUS_PORT: a separate port for /metrics, or 0 to serve it on the main port.
    pub prometheus_port: u16,
    pub prometheus_token: Option<String>,

    // --- Security ---
    pub secret_key: String,
    pub disable_anonymous: bool,

    // --- WebSocket ---
    pub socket_idle_timer: Duration,
    pub client_disconnection_retention: Duration,
    /// SERVER_OUTBOX_BUDGET_MB: what all the outbound queues may hold together (new, default 256).
    pub outbox_budget: usize,
    /// SERVER_RESUME_BUDGET_MB: what all the resume buffers may hold together (new, default 256).
    pub resume_budget: usize,

    // --- Proximity (back) ---
    pub minimum_distance: f64,
    pub group_radius: f64,
    pub max_per_group: usize,

    // --- map-storage ---
    /// SERVER_MAP_STORAGE_PORT: the socle sends the map-storage host there.
    pub map_storage_port: u16,
    /// STORAGE_DIRECTORY: where the maps live.
    pub storage_directory: String,

    // --- Variables (back) ---
    pub redis_host: Option<String>,
    pub redis_port: u16,
    pub redis_password: Option<String>,
    /// STORE_VARIABLES_FOR_LOCAL_MAPS: check and save the variables of maps on a private network too.
    pub store_variables_for_local_maps: bool,

    // --- Front ---
    pub front_url: String,
    pub pusher_url: String,
    pub assets_url: Option<String>,
    pub assets_internal_url: Option<String>,
    pub start_room_url: String,

    /// Every variable, for the parts that pass values through untouched (the front configuration).
    pub raw: HashMap<String, String>,
}

pub struct Env {
    vars: HashMap<String, String>,
    errors: Vec<String>,
}

impl Env {
    pub fn from_process() -> Self {
        Self::new(std::env::vars().collect())
    }

    pub fn new(vars: HashMap<String, String>) -> Self {
        Self { vars, errors: Vec::new() }
    }

    /// Like zod's `emptyStringToUndefined`: an empty variable counts as unset.
    pub fn str(&self, name: &str) -> Option<String> {
        self.vars.get(name).filter(|v| !v.is_empty()).cloned()
    }

    pub fn required(&mut self, name: &str) -> String {
        self.str(name).unwrap_or_else(|| {
            self.errors.push(format!("{name}: required"));
            String::new()
        })
    }

    pub fn number<T: std::str::FromStr>(&mut self, name: &str, default: T) -> T {
        match self.str(name) {
            None => default,
            Some(v) => v.trim().parse().unwrap_or_else(|_| {
                self.errors.push(format!("{name}: expected a number, got {v:?}"));
                default
            }),
        }
    }

    /// Like `BoolAsString`: "true"/"1" and "false"/"0".
    pub fn bool(&mut self, name: &str, default: bool) -> bool {
        match self.str(name).as_deref() {
            None => default,
            Some("true" | "1") => true,
            Some("false" | "0") => false,
            Some(v) => {
                self.errors.push(format!("{name}: expected true or false, got {v:?}"));
                default
            }
        }
    }
}

impl Config {
    pub fn load(mut env: Env) -> Result<Self, Vec<String>> {
        // SERVER_HTTP_PORT is the socle's name for it (dev/stack.yaml).
        let http_port = match env.str("SERVER_HTTP_PORT") {
            Some(_) => env.number("SERVER_HTTP_PORT", 3000),
            None => env.number("PUSHER_HTTP_PORT", 3000),
        };
        let prometheus_port = env.number("PROMETHEUS_PORT", 0);
        let pusher_url = env.str("PUSHER_URL").unwrap_or_default();
        let assets_url = env.str("ASSETS_URL").map(|u| u.trim_end_matches('/').to_owned());
        let config = Config {
            http_port,
            prometheus_port: if prometheus_port == http_port { 0 } else { prometheus_port },
            prometheus_token: env.str("PROMETHEUS_AUTHORIZATION_TOKEN"),
            secret_key: env.required("SECRET_KEY"),
            disable_anonymous: env.bool("DISABLE_ANONYMOUS", false),
            socket_idle_timer: Duration::from_secs(env.number("SOCKET_IDLE_TIMER", 120)),
            client_disconnection_retention: Duration::from_millis(
                env.number("CLIENT_DISCONNECTION_RETENTION_MS", 30_000),
            ),
            outbox_budget: env.number::<usize>("SERVER_OUTBOX_BUDGET_MB", 256) * 1024 * 1024,
            resume_budget: env.number::<usize>("SERVER_RESUME_BUDGET_MB", 256) * 1024 * 1024,
            minimum_distance: env.number("MINIMUM_DISTANCE", 64.0),
            group_radius: env.number("GROUP_RADIUS", 48.0),
            max_per_group: env.number("MAX_PER_GROUP", 4),
            map_storage_port: env.number("SERVER_MAP_STORAGE_PORT", 3002),
            storage_directory: env.str("STORAGE_DIRECTORY").unwrap_or_else(|| "./public".into()),
            redis_host: env.str("REDIS_HOST"),
            redis_port: env.number("REDIS_PORT", 6379),
            redis_password: env.str("REDIS_PASSWORD"),
            store_variables_for_local_maps: env.bool("STORE_VARIABLES_FOR_LOCAL_MAPS", false),
            front_url: env.str("FRONT_URL").unwrap_or_default(),
            assets_internal_url: env
                .str("ASSETS_INTERNAL_URL")
                .map(|u| u.trim_end_matches('/').to_owned())
                .or_else(|| assets_url.clone()),
            assets_url,
            pusher_url,
            start_room_url: env
                .str("START_ROOM_URL")
                .unwrap_or_else(|| "/_/global/maps.workadventu.re/starter/map.json".to_owned()),
            raw: env.vars.clone(),
        };
        if env.errors.is_empty() {
            Ok(config)
        } else {
            Err(env.errors)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn env(pairs: &[(&str, &str)]) -> Env {
        Env::new(pairs.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect())
    }

    #[test]
    fn defaults_match_the_typescript_services() {
        let c = Config::load(env(&[("SECRET_KEY", "s")])).unwrap();
        assert_eq!(c.http_port, 3000);
        assert_eq!(c.minimum_distance, 64.0);
        assert_eq!(c.group_radius, 48.0);
        assert_eq!(c.max_per_group, 4);
        assert_eq!(c.socket_idle_timer, Duration::from_secs(120));
        assert_eq!(c.client_disconnection_retention, Duration::from_secs(30));
    }

    #[test]
    fn invalid_values_are_all_reported() {
        let errors = Config::load(env(&[("PUSHER_HTTP_PORT", "abc"), ("DISABLE_ANONYMOUS", "yes")])).unwrap_err();
        assert_eq!(errors.len(), 3, "{errors:?}"); // + missing SECRET_KEY
    }

    #[test]
    fn prometheus_on_the_http_port_means_the_main_listener() {
        let c = Config::load(env(&[("SECRET_KEY", "s"), ("PROMETHEUS_PORT", "3000")])).unwrap();
        assert_eq!(c.prometheus_port, 0);
    }
}
