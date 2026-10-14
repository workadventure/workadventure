//! map-storage: the map files over HTTP (serving, upload of a zip, PUT/PATCH/DELETE of single files, move, copy,
//! download, the map list, the private files of the editor), and the WAM files the rooms save. Storage is flat
//! under STORAGE_DIRECTORY, like map-storage without USE_DOMAIN_NAME_IN_PATH. It has its own listener
//! (SERVER_MAP_STORAGE_PORT), the way the socle routes the map-storage host.

mod files;
mod upload;

use std::collections::HashMap;
use std::path::{Component, Path, PathBuf};
use std::sync::Arc;

use axum::Router;
use axum::extract::{DefaultBodyLimit, Request};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode, header};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use base64::Engine;
use dashmap::DashMap;
use wa_core::wam::{History, Wam};
use wa_proto::messages as pb;

use crate::AppState;
use crate::room_actor::RoomCmd;

/// MAX_UNCOMPRESSED_SIZE of map-storage.
const MAX_UPLOAD: usize = 1024 * 1024 * 1024;

pub(crate) type Refusal = (StatusCode, String);

/// A map as the editor left it (MapsManager keeps its maps in memory): it outlives its room, so that a user
/// arriving just after the last one left still gets the recent edits.
pub struct CachedMap {
    pub wam: Option<Wam>,
    pub history: History<pb::EditMapCommandMessage>,
    pub generation: u64,
}

/// One map, owned by at most one room at a time: a room holds its lock for its whole life.
pub type MapSlot = Arc<tokio::sync::Mutex<Option<CachedMap>>>;

pub struct Storage {
    root: PathBuf,
    /// Changes to the stored files and room saves never overlap.
    write: tokio::sync::Mutex<()>,
    /// Per file, bumped by each change from HTTP: a room's save from before it must not overwrite what it wrote.
    generations: parking_lot::Mutex<HashMap<String, u64>>,
    maps: DashMap<String, MapSlot>,
}

impl Storage {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self {
            root: root.into(),
            write: tokio::sync::Mutex::new(()),
            generations: parking_lot::Mutex::new(HashMap::new()),
            maps: DashMap::new(),
        }
    }

    pub fn generation(&self, rel: &str) -> u64 {
        *self.generations.lock().entry(rel.trim_start_matches('/').to_owned()).or_insert(0)
    }

    pub fn map_slot(&self, rel: &str) -> MapSlot {
        self.maps.entry(rel.to_owned()).or_default().clone()
    }

    /// A storage path, or None if it climbs out of the root.
    pub fn path(&self, rel: &str) -> Option<PathBuf> {
        resolve(&self.root, rel)
    }

    pub async fn read(&self, rel: &str) -> Option<Vec<u8>> {
        tokio::fs::read(self.path(rel)?).await.ok()
    }

    /// Writes a WAM a room changed, unless the files were changed over HTTP since the room loaded it.
    pub async fn save(&self, rel: &str, generation: u64, bytes: &[u8]) {
        let Some(path) = self.path(rel) else { return };
        let _guard = self.write.lock().await;
        if generation != self.generation(rel) {
            return;
        }
        if let Err(e) = write_atomic(&path, bytes) {
            tracing::error!(%rel, error = %e, "could not save the WAM file");
        }
    }

    /// A file the map editor stores (custom entity images, private files), outside the WAM.
    pub async fn put_asset(&self, rel: String, bytes: Vec<u8>) -> std::io::Result<()> {
        let path = self.path(&rel).ok_or(std::io::ErrorKind::InvalidInput)?;
        let _guard = self.write.lock().await;
        tokio::task::spawn_blocking(move || write_atomic(&path, &bytes)).await.map_err(std::io::Error::other)?
    }

    /// Read, change and write back a JSON file under the write lock (`default` when it does not exist yet).
    pub async fn update_json<T: Send + 'static>(
        &self,
        rel: &str,
        default: serde_json::Value,
        f: impl FnOnce(&mut serde_json::Value) -> Result<T, String> + Send + 'static,
    ) -> Result<T, String> {
        let path = self.path(rel).ok_or("Invalid path")?;
        let _guard = self.write.lock().await;
        tokio::task::spawn_blocking(move || {
            let mut doc = std::fs::read(&path)
                .ok()
                .and_then(|b| serde_json::from_slice(&b).ok())
                .unwrap_or(default);
            let result = f(&mut doc)?;
            write_atomic(&path, doc.to_string().as_bytes()).map_err(|e| e.to_string())?;
            Ok(result)
        })
        .await
        .map_err(|e| e.to_string())?
    }

    pub async fn remove_asset(&self, rel: &str) {
        if let Some(path) = self.path(rel) {
            let _guard = self.write.lock().await;
            let _ = tokio::fs::remove_file(path).await;
        }
    }

    /// Every WAM file: `(path, {mapUrl, metadata, vendor?})`, the metadata with the counts of searchable areas and
    /// entities (MapListService.updateWAMFileInCache).
    pub async fn wam_list(&self) -> Vec<(String, serde_json::Value)> {
        let root = self.root.clone();
        tokio::task::spawn_blocking(move || {
            let searchable = |items: &mut dyn Iterator<Item = &serde_json::Value>| {
                items
                    .filter(|i| i["properties"].as_array().is_some_and(|p| p.iter().any(|p| p["searchable"] == true)))
                    .count()
            };
            let mut maps = Vec::new();
            let mut stack = vec![root.clone()];
            while let Some(d) = stack.pop() {
                let Ok(read) = std::fs::read_dir(&d) else { continue };
                for e in read.flatten() {
                    let path = e.path();
                    if path.is_dir() {
                        stack.push(path);
                        continue;
                    }
                    let rel = path.strip_prefix(&root).unwrap_or(&path).to_string_lossy().replace('\\', "/");
                    if !rel.ends_with(".wam") {
                        continue;
                    }
                    let Ok(wam) = serde_json::from_slice::<serde_json::Value>(&std::fs::read(&path).unwrap_or_default()) else {
                        continue;
                    };
                    if !wam["mapUrl"].is_string() {
                        continue;
                    }
                    let mut metadata = wam["metadata"].as_object().cloned().unwrap_or_default();
                    metadata.insert("areasSearchable".into(), searchable(&mut wam["areas"].as_array().into_iter().flatten()).into());
                    metadata.insert(
                        "entitiesSearchable".into(),
                        searchable(&mut wam["entities"].as_object().into_iter().flatten().map(|(_, e)| e)).into(),
                    );
                    let mut entry = serde_json::json!({"mapUrl": wam["mapUrl"], "metadata": metadata});
                    if let Some(vendor) = wam.get("vendor") {
                        entry["vendor"] = vendor.clone();
                    }
                    maps.push((rel, entry));
                }
            }
            maps
        })
        .await
        .unwrap_or_default()
    }

    /// Runs a change of the files under `prefixes` off the runtime: no room save from before it lands after it.
    async fn change<T: Send + 'static>(&self, prefixes: &[&str], f: impl FnOnce(&Path) -> T + Send + 'static) -> T {
        let _guard = self.write.lock().await;
        for (rel, generation) in self.generations.lock().iter_mut() {
            if prefixes.iter().any(|p| concerns(p, rel)) {
                *generation += 1;
            }
        }
        let root = self.root.clone();
        tokio::task::spawn_blocking(move || f(&root)).await.expect("storage task panicked")
    }
}

pub(crate) fn resolve(root: &Path, rel: &str) -> Option<PathBuf> {
    let rel = Path::new(rel.trim_start_matches('/'));
    rel.components()
        .all(|c| matches!(c, Component::Normal(_)))
        .then(|| root.join(rel))
}

/// Through a temporary file, so a reader never sees half a file.
pub(crate) fn write_atomic(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(".tmp");
    std::fs::write(&tmp, bytes)?;
    std::fs::rename(&tmp, path)
}

/// What happened to map files, for the rooms that use them (`prefix` matches a WAM path or a directory).
#[derive(Debug, Clone)]
pub enum MapChange {
    /// handleMapStorageUploadMapDetected: reload, and ask the users to refresh.
    Replaced(String),
    /// handleMapStorageDeleteMapDetected: tell the users, and close their connections.
    Deleted(String),
}

/// Whether `rel` is the file `prefix`, or under the directory `prefix` ("" is everything).
fn concerns(prefix: &str, rel: &str) -> bool {
    let prefix = prefix.trim_matches('/');
    prefix.is_empty() || rel == prefix || rel.starts_with(&format!("{prefix}/"))
}

impl MapChange {
    pub fn concerns(&self, wam: &str) -> bool {
        let (MapChange::Replaced(prefix) | MapChange::Deleted(prefix)) = self;
        concerns(prefix, wam)
    }
}

async fn notify(state: &AppState, change: MapChange) {
    for room in state.rooms.live() {
        let _ = room.send(RoomCmd::MapFiles(change.clone())).await;
    }
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/ping", get(|| async { "pong" }))
        .route("/upload", post(upload::upload))
        .route("/download", get(upload::download))
        .route("/upload-endpoint", get(files::upload_endpoint))
        .route("/maps", get(files::maps))
        .route("/move", post(files::move_file))
        .route("/copy", post(files::copy_file))
        .route("/private/files/{*path}", get(files::private_file).fallback(files::any))
        .fallback(files::any)
        .layer(DefaultBodyLimit::max(MAX_UPLOAD))
        .layer(middleware::from_fn(cors))
        .with_state(state)
}

/// `cors()` with its defaults, and `nosniff` everywhere.
async fn cors(request: Request, next: Next) -> Response {
    let preflight = (request.method() == Method::OPTIONS).then(|| {
        request
            .headers()
            .get(header::ACCESS_CONTROL_REQUEST_HEADERS)
            .cloned()
    });
    let mut response = match preflight {
        Some(asked) => {
            let mut r = StatusCode::NO_CONTENT.into_response();
            let h = r.headers_mut();
            h.insert(
                header::ACCESS_CONTROL_ALLOW_METHODS,
                HeaderValue::from_static("GET,HEAD,PUT,PATCH,POST,DELETE"),
            );
            if let Some(asked) = asked {
                h.insert(header::ACCESS_CONTROL_ALLOW_HEADERS, asked);
            }
            r
        }
        None => next.run(request).await,
    };
    let h = response.headers_mut();
    h.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*"));
    h.insert(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
    response
}

/// The refusal unless the request has basic (AUTHENTICATION_USER / AUTHENTICATION_PASSWORD) or bearer
/// (AUTHENTICATION_TOKEN) credentials, each when enabled; with none enabled, nothing gets in.
fn unauthorized(state: &AppState, headers: &HeaderMap) -> Option<Response> {
    let env = |k: &str| state.config.raw.get(k).filter(|v| !v.is_empty());
    let on = |k: &str| env(k).is_some_and(|v| v == "true" || v == "1");
    let auth = headers.get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()).unwrap_or("");
    let basic = on("ENABLE_BASIC_AUTHENTICATION")
        && auth
            .strip_prefix("Basic ")
            .and_then(|e| base64::engine::general_purpose::STANDARD.decode(e.trim()).ok())
            .is_some_and(|decoded| {
                let (Some(user), Some(password)) = (env("AUTHENTICATION_USER"), env("AUTHENTICATION_PASSWORD")) else {
                    return false;
                };
                decoded == format!("{user}:{password}").into_bytes()
            });
    let bearer = on("ENABLE_BEARER_AUTHENTICATION")
        && auth.strip_prefix("Bearer ").is_some_and(|t| env("AUTHENTICATION_TOKEN").is_some_and(|e| e == t.trim()));
    if basic || bearer {
        return None;
    }
    Some((StatusCode::UNAUTHORIZED, [(header::WWW_AUTHENTICATE, "Basic realm=\"Users\"")], "Unauthorized").into_response())
}

/// map-storage's validation errors: `{"<file>": {"<category>": [{type, message, details}]}}`.
fn validation_error(category: &str, message: &str, details: &str) -> serde_json::Value {
    serde_json::json!({ category: [{"type": "error", "message": message, "details": details}] })
}
