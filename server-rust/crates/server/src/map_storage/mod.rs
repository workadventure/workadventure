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
    pub revision: u64,
}

/// One map, owned by at most one room at a time: a room holds its lock for its whole life.
pub type MapSlot = Arc<tokio::sync::Mutex<Option<CachedMap>>>;

pub struct Storage {
    root: PathBuf,
    /// Changes to the stored files and room saves never overlap.
    write: tokio::sync::Mutex<()>,
    /// Per file, bumped by each change from HTTP: a room's save from before it must not overwrite what it wrote.
    generations: parking_lot::Mutex<HashMap<String, u64>>,
    /// Per WAM file, the newest revision written: a save that finishes late never brings back an older one.
    saved: parking_lot::Mutex<HashMap<String, u64>>,
    maps: DashMap<String, MapSlot>,
}

impl Storage {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self {
            root: root.into(),
            write: tokio::sync::Mutex::new(()),
            generations: parking_lot::Mutex::new(HashMap::new()),
            saved: parking_lot::Mutex::new(HashMap::new()),
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

    /// The newest revision of a WAM written so far: a room's edits count up from there.
    pub fn revision(&self, rel: &str) -> u64 {
        self.saved.lock().get(rel.trim_start_matches('/')).copied().unwrap_or(0)
    }

    /// Writes revision `revision` of a WAM a room changed, unless the files were changed over HTTP since the room
    /// loaded it (`generation`) or a newer revision is already written.
    pub async fn save(&self, rel: &str, generation: u64, revision: u64, bytes: Vec<u8>) {
        let Some(path) = self.path(rel) else { return };
        let _guard = self.write.lock().await;
        if generation != self.generation(rel) {
            return;
        }
        {
            let mut saved = self.saved.lock();
            let newest = saved.entry(rel.trim_start_matches('/').to_owned()).or_insert(0);
            if revision <= *newest {
                return;
            }
            *newest = revision;
        }
        let written = tokio::task::spawn_blocking(move || write_atomic(&path, &bytes)).await;
        if let Err(e) = written.map_err(std::io::Error::other).and_then(|r| r) {
            tracing::error!(%rel, error = %e, "could not save the WAM file");
        }
    }

    /// Holds every write, as a slow disk would (tests).
    #[doc(hidden)]
    pub async fn hold_writes(&self) -> tokio::sync::MutexGuard<'_, ()> {
        self.write.lock().await
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

/// USE_DOMAIN_NAME_IN_PATH (PathMapper): each tenant's files under the folder of its domain. The domain of a
/// request: for the authenticated REST calls `X-Map-Storage-Host`, then `X-Forwarded-Host`, then `Host`; for reads
/// `X-Forwarded-Host`, then `Host` (Express's `req.hostname` behind a trusted proxy). Without the option: "".
// The ingress sets X-Forwarded-Host; X-Map-Storage-Host only matters to the authenticated calls (the admin's).
pub(crate) fn domain_dir(state: &AppState, headers: &HeaderMap, rest: bool) -> Option<String> {
    if !state.config.use_domain_name_in_path {
        return Some(String::new());
    }
    let get = |k: &str| headers.get(k).and_then(|v| v.to_str().ok()).map(|v| v.split(',').next().unwrap_or(v).trim()).filter(|v| !v.is_empty());
    let host = rest.then(|| get("x-map-storage-host")).flatten().or_else(|| get("x-forwarded-host")).or_else(|| get("host")).unwrap_or_default();
    domain_folder(host)
}

pub(crate) fn invalid_domain() -> Response {
    (StatusCode::BAD_REQUEST, "Invalid domain").into_response()
}

/// The folder of a domain (the port dropped), refused if it could climb out.
pub fn domain_folder(host: &str) -> Option<String> {
    let domain = host.rsplit_once(':').filter(|(_, p)| p.chars().all(|c| c.is_ascii_digit())).map_or(host, |(h, _)| h).to_ascii_lowercase();
    (!domain.is_empty() && !domain.contains("..") && !domain.contains('/') && !domain.contains('\\')).then(|| format!("{domain}/"))
}

/// The storage key of a WAM URL, as the rooms and the private files find it (mapPathUsingUrl): its path
/// without PATH_PREFIX, under the folder of its host with USE_DOMAIN_NAME_IN_PATH.
pub fn wam_key_of_url(config: &crate::config::Config, url: &str) -> Option<String> {
    let parsed = reqwest::Url::parse(url).ok()?;
    let path = percent_encoding::percent_decode_str(parsed.path()).decode_utf8().ok()?;
    let path = path.strip_prefix(config.map_storage_prefix.as_str()).unwrap_or(&path).trim_start_matches('/');
    let dir = if config.use_domain_name_in_path { domain_folder(parsed.host_str()?)? } else { String::new() };
    Some(format!("{dir}{path}"))
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
    web_hook(state, &change);
    for room in state.rooms.live() {
        let _ = room.send(RoomCmd::MapFiles(change.clone())).await;
    }
}

/// A27 (WebHookService): `{domain, mapPath?, action}` to WEB_HOOK_URL, fire and forget (ENABLE_WEB_HOOK, on by
/// default). The domain is the tenant's folder, or the public map-storage host.
fn web_hook(state: &AppState, change: &MapChange) {
    let env = |k: &str| state.config.raw.get(k).filter(|v| !v.is_empty()).cloned();
    let Some(url) = env("WEB_HOOK_URL") else { return };
    if matches!(env("ENABLE_WEB_HOOK").as_deref(), Some("false" | "0")) {
        return;
    }
    let (MapChange::Replaced(path) | MapChange::Deleted(path)) = change;
    let (domain, path) = if state.config.use_domain_name_in_path {
        let (d, p) = path.split_once('/').unwrap_or((path.as_str(), ""));
        (d.to_owned(), p.to_owned())
    } else {
        let public = env("PUBLIC_MAP_STORAGE_URL").and_then(|u| reqwest::Url::parse(&u).ok()?.host_str().map(str::to_owned));
        (public.unwrap_or_default(), path.clone())
    };
    let mut body = serde_json::json!({"domain": domain, "action": if matches!(change, MapChange::Deleted(_)) { "delete" } else { "update" }});
    if path.ends_with(".wam") {
        body["mapPath"] = path.into();
    }
    let mut request = state.http.post(url).json(&body).timeout(std::time::Duration::from_secs(10));
    if let Some(token) = env("WEB_HOOK_API_TOKEN") {
        request = request.header(header::AUTHORIZATION, token);
    }
    tokio::spawn(async move {
        if let Err(e) = request.send().await.and_then(reqwest::Response::error_for_status) {
            tracing::error!(error = %e, "the map-storage web hook failed");
        }
    });
}

pub fn router(state: AppState) -> Router {
    let router = Router::new()
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
        .layer(middleware::from_fn(cors));
    // PATH_PREFIX: mounted under it; the routes themselves stay the same.
    let prefix = state.config.map_storage_prefix.clone();
    let router = if prefix.is_empty() || prefix == "/" { router } else { Router::new().nest(&prefix, router) };
    router.with_state(state)
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
async fn unauthorized(state: &AppState, headers: &HeaderMap) -> Option<Response> {
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
    let token = auth.strip_prefix("Bearer ").map(str::trim).filter(|t| !t.is_empty());
    let mut bearer = on("ENABLE_BEARER_AUTHENTICATION") && token.is_some_and(|t| env("AUTHENTICATION_TOKEN").is_some_and(|e| e == t));
    // A26: another bearer may be one the admin knows, for this domain.
    if on("ENABLE_BEARER_AUTHENTICATION")
        && !bearer
        && let (Some(t), Some(validator)) = (token, env("AUTHENTICATION_VALIDATOR_URL"))
    {
        let get = |k: &str| headers.get(k).and_then(|v| v.to_str().ok()).map(|v| v.split(',').next().unwrap_or(v).trim()).filter(|v| !v.is_empty());
        let domain = get("x-map-storage-host").or_else(|| get("x-forwarded-host")).or_else(|| get("host")).unwrap_or_default();
        let domain = domain.rsplit_once(':').map_or(domain, |(h, _)| h);
        let asked = state
            .http
            .get(validator)
            .query(&[("domain", domain)])
            .header("X-API-Key", t)
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await;
        bearer = asked.is_ok_and(|r| r.status().is_success());
    }
    if basic || bearer {
        return None;
    }
    Some((StatusCode::UNAUTHORIZED, [(header::WWW_AUTHENTICATE, "Basic realm=\"Users\"")], "Unauthorized").into_response())
}

/// map-storage's validation errors: `{"<file>": {"<category>": [{type, message, details}]}}`.
fn validation_error(category: &str, message: &str, details: &str) -> serde_json::Value {
    serde_json::json!({ category: [{"type": "error", "message": message, "details": details}] })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn a_save_that_finishes_late_never_overwrites_a_newer_one_or_an_http_change() {
        let dir = std::env::temp_dir().join(format!("wa-rust-save-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let storage = Storage::new(&dir);
        let (rel, read) = ("maps/t.wam", || std::fs::read_to_string(dir.join("maps/t.wam")).unwrap());
        let generation = storage.generation(rel);
        storage.save(rel, generation, 11, b"v11".to_vec()).await;
        storage.save(rel, generation, 10, b"v10".to_vec()).await;
        assert_eq!(read(), "v11");
        assert_eq!(storage.revision(rel), 11);
        // Files replaced over HTTP: a save from before is dropped, whatever its revision.
        storage.change(&["maps"], |_| ()).await;
        storage.save(rel, generation, 12, b"v12".to_vec()).await;
        assert_eq!(read(), "v11");
        storage.save(rel, storage.generation(rel), 12, b"v12".to_vec()).await;
        assert_eq!(read(), "v12");
        let _ = std::fs::remove_dir_all(&dir);
    }
}
