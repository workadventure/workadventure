//! Adapters and runtime around `wa-core`: HTTP and WebSocket transport, protobuf encoding, actors.

pub mod config;
pub mod http;
pub mod metrics;
pub mod outbox;
pub mod registry;
pub mod resume;

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use axum::Router;

use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    ready: Arc<AtomicBool>,
}

impl AppState {
    pub fn new(config: Config) -> Self {
        Self {
            config: Arc::new(config),
            ready: Arc::new(AtomicBool::new(true)),
        }
    }

    pub fn is_ready(&self) -> bool {
        self.ready.load(Ordering::Relaxed)
    }
}

pub fn router(state: AppState) -> Router {
    http::routes().with_state(state)
}
