//! Adapters and runtime around `wa-core`: HTTP and WebSocket transport, protobuf encoding, actors.
#![recursion_limit = "256"]

pub mod admin;
pub mod admin_api;
pub mod admin_queries;
pub mod budget;
pub mod config;
pub mod custom_entities;
pub mod embed;
pub mod json_patch;
pub mod front;
pub mod http;
pub mod jwt;
pub mod livekit;
pub mod local_admin;
pub mod logic;
pub mod map_storage;
pub mod metrics;
pub mod mustache;
pub mod oidc;
pub mod openapi;
pub mod outbox;
pub mod player_variables;
pub mod redis_store;
pub mod registry;
pub mod recordings;
pub mod resume;
pub mod room_actor;
pub mod room_api;
pub mod room_map;
pub mod s3;
pub mod session;
pub mod space_actor;
pub mod wire;
pub mod uploader;
pub mod user_routes;
pub mod ws;

use std::sync::Arc;

use axum::Router;
use axum::routing::get;
use dashmap::DashMap;
use wa_core::RoomConfig;

use crate::config::Config;
use crate::front::FrontAssets;
use crate::registry::ActorRegistry;
use crate::room_actor::RoomCmd;
use crate::session::Session;
use crate::space_actor::SpaceCmd;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub room_config: RoomConfig,
    pub rooms: Arc<ActorRegistry<RoomCmd>>,
    pub spaces: Arc<ActorRegistry<SpaceCmd>>,
    /// Sessions a client may resume, by connection id.
    pub sessions: Arc<DashMap<String, Arc<Session>>>,
    pub front: Arc<FrontAssets>,
    pub page_script: Arc<str>,
    pub http: reqwest::Client,
    pub oidc: Option<Arc<oidc::OidcConfig>>,
    /// The provider's endpoints, discovered on first use.
    pub oidc_provider: Arc<parking_lot::Mutex<Option<oidc::Provider>>>,
    pub budgets: session::Budgets,
    pub storage: Arc<map_storage::Storage>,
    pub redis: Arc<redis_store::RedisStore>,
    /// The remote admin (ADMIN_API_URL), set at startup once it answered; None: LocalAdmin.
    pub admin: Option<Arc<admin_api::AdminApi>>,
}

impl AppState {
    pub fn new(config: Config) -> Self {
        session::set_idle_timer(config.socket_idle_timer);
        Self {
            room_config: RoomConfig {
                minimum_distance: config.minimum_distance,
                group_radius: config.group_radius,
                max_per_group: config.max_per_group,
            },
            rooms: Arc::new(ActorRegistry::new()),
            spaces: Arc::new(ActorRegistry::new()),
            sessions: Arc::new(DashMap::new()),
            front: Arc::new(FrontAssets::new(&config)),
            page_script: front::script(&config, None),
            http: reqwest::Client::new(),
            oidc: oidc::OidcConfig::from(&config).map(Arc::new),
            oidc_provider: Arc::new(parking_lot::Mutex::new(None)),
            budgets: session::Budgets {
                outboxes: Arc::new(budget::Budget::new(config.outbox_budget)),
                resume: Arc::new(budget::Budget::new(config.resume_budget)),
            },
            storage: Arc::new(map_storage::Storage::new(&config.storage_directory)),
            redis: redis_store::RedisStore::new(&config),
            admin: None,
            config: Arc::new(config),
        }
    }

    /// Ready once the page can be served (when a front container is configured).
    pub fn is_ready(&self) -> bool {
        self.config.assets_internal_url.is_none() || self.front.is_ready()
    }
}

pub fn router(state: AppState) -> Router {
    http::routes()
        .merge(admin::routes())
        .merge(user_routes::routes())
        .merge(openapi::routes(&state))
        .merge(front::routes())
        .merge(oidc::routes())
        .route("/ws/room", get(ws::ws_room))
        .with_state(state)
}
