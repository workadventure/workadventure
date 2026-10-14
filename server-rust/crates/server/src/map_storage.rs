//! map-storage, the minimum (J2): serving the map files, `POST /upload` of a zip, and the WAM files the map
//! editor saves. Storage is flat under STORAGE_DIRECTORY, like map-storage without USE_DOMAIN_NAME_IN_PATH.
//! It has its own listener (SERVER_MAP_STORAGE_PORT), the way the socle routes the map-storage host.

use std::io::Read;
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

use axum::Router;
use axum::body::Body;
use axum::extract::{DefaultBodyLimit, Multipart, Request, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode, header};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use base64::Engine;
use wa_core::wam::Wam;

use crate::AppState;
use crate::room_actor::RoomCmd;

/// MAX_UNCOMPRESSED_SIZE of map-storage.
const MAX_UPLOAD: usize = 1024 * 1024 * 1024;

pub struct Storage {
    root: PathBuf,
    /// Uploads and saves never overlap.
    write: tokio::sync::Mutex<()>,
    /// Bumped by each upload: a room's save from before it must not overwrite the new files.
    generation: AtomicU64,
}

impl Storage {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self {
            root: root.into(),
            write: tokio::sync::Mutex::new(()),
            generation: AtomicU64::new(0),
        }
    }

    pub fn generation(&self) -> u64 {
        self.generation.load(Ordering::Acquire)
    }

    /// A storage path, or None if it climbs out of the root.
    fn path(&self, rel: &str) -> Option<PathBuf> {
        let rel = Path::new(rel.trim_start_matches('/'));
        rel.components()
            .all(|c| matches!(c, Component::Normal(_)))
            .then(|| self.root.join(rel))
    }

    pub async fn read(&self, rel: &str) -> Option<Vec<u8>> {
        tokio::fs::read(self.path(rel)?).await.ok()
    }

    /// Writes a WAM a room changed, unless an upload replaced the maps since the room loaded it.
    pub async fn save(&self, rel: &str, generation: u64, bytes: &[u8]) {
        let Some(path) = self.path(rel) else { return };
        let _guard = self.write.lock().await;
        if generation != self.generation() {
            return;
        }
        let tmp = path.with_extension("wam.tmp");
        let result = async {
            tokio::fs::write(&tmp, bytes).await?;
            tokio::fs::rename(&tmp, &path).await
        }
        .await;
        if let Err(e) = result {
            tracing::error!(%rel, error = %e, "could not save the WAM file");
        }
    }

    /// `POST /upload` (UploadController): clears the directory, then unpacks the zip into it.
    async fn upload(&self, directory: String, zip: Vec<u8>) -> Result<(), Refusal> {
        let dir = self
            .path(&directory)
            .ok_or((StatusCode::BAD_REQUEST, "Invalid directory".to_owned()))?;
        let _guard = self.write.lock().await;
        self.generation.fetch_add(1, Ordering::AcqRel);
        tokio::task::spawn_blocking(move || unpack(&dir, &zip))
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    }
}

type Refusal = (StatusCode, String);

/// The zip's files, skipping directories and anything under a name starting with a dot.
fn entries(zip: &[u8]) -> Result<Vec<(String, Vec<u8>)>, Refusal> {
    let bad = |e: zip::result::ZipError| (StatusCode::BAD_REQUEST, format!("Invalid zip file: {e}"));
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(zip)).map_err(bad)?;
    let mut files = Vec::new();
    let mut total = 0usize;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(bad)?;
        let name = entry.name().map_err(bad)?.replace('\\', "/");
        if entry.is_dir() || name.split('/').any(|s| s.starts_with('.') || s.is_empty()) {
            continue;
        }
        let mut bytes = Vec::new();
        entry
            .by_ref()
            .take((MAX_UPLOAD - total + 1) as u64)
            .read_to_end(&mut bytes)
            .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
        total += bytes.len();
        if total > MAX_UPLOAD {
            return Err((StatusCode::PAYLOAD_TOO_LARGE, "The uncompressed upload is too big".into()));
        }
        files.push((name, bytes));
    }
    Ok(files)
}

fn unpack(dir: &Path, zip: &[u8]) -> Result<(), Refusal> {
    let files = entries(zip)?;
    let io = |e: std::io::Error| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string());
    let has = |name: &str| files.iter().any(|(n, _)| n == name);
    // Everything goes, except a WAM whose map comes again without one (its edits survive the reset).
    let mut stack = vec![dir.to_path_buf()];
    while let Some(d) = stack.pop() {
        let Ok(read) = std::fs::read_dir(&d) else { continue };
        for e in read.flatten() {
            let path = e.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            let rel = path.strip_prefix(dir).unwrap_or(&path).to_string_lossy().replace('\\', "/");
            let kept = rel
                .strip_suffix(".wam")
                .is_some_and(|base| has(&format!("{base}.tmj")) && !has(&rel));
            if !kept {
                std::fs::remove_file(&path).map_err(io)?;
            }
        }
    }
    for (name, bytes) in &files {
        let path = dir.join(name);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(io)?;
        }
        std::fs::write(&path, bytes).map_err(io)?;
    }
    for (name, tmj) in files.iter().filter(|(n, _)| n.ends_with(".tmj")) {
        let wam = dir.join(name.replace(".tmj", ".wam"));
        if !wam.exists() {
            let map_url = format!("./{}", name.rsplit('/').next().unwrap_or(name));
            std::fs::write(&wam, Wam::fresh(&map_url, tmj).to_json()).map_err(io)?;
        }
    }
    Ok(())
}

// ------------------------------------------------------------------------------------------------ HTTP

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/ping", get(|| async { "pong" }))
        .route("/upload", post(upload).layer(DefaultBodyLimit::max(MAX_UPLOAD)))
        .fallback(get(file))
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

fn content_type(path: &str) -> &'static str {
    let ext = path.rsplit_once('.').map(|(_, e)| e.to_ascii_lowercase()).unwrap_or_default();
    match ext.as_str() {
        "json" | "tmj" | "tsj" | "wam" => "application/json",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "js" | "mjs" => "text/javascript",
        "css" => "text/css",
        "html" | "htm" => "text/html",
        "txt" => "text/plain",
        "ogg" => "audio/ogg",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "mp4" => "video/mp4",
        "pdf" => "application/pdf",
        _ => "application/octet-stream",
    }
}

/// Any stored file (index.ts `*.wam` and proxyFiles). The path is URL-decoded, `+` included.
async fn file(State(state): State<AppState>, request: Request) -> Response {
    let raw = request.uri().path().replace('+', " ");
    let path = percent_encoding::percent_decode_str(&raw).decode_utf8_lossy().into_owned();
    if path.contains("..") {
        return (StatusCode::BAD_REQUEST, "Invalid path").into_response();
    }
    let Some(bytes) = state.storage.read(&path).await else {
        return (StatusCode::NOT_FOUND, format!("Cannot GET {}", request.uri().path())).into_response();
    };
    let cache = if path.ends_with(".wam") {
        "max-age=5".to_owned()
    } else {
        state.config.raw.get("CACHE_CONTROL").cloned().unwrap_or_else(|| "public, s-max-age=10".into())
    };
    let mut response = Response::new(Body::from(bytes));
    let h = response.headers_mut();
    h.insert(header::CONTENT_TYPE, HeaderValue::from_static(content_type(&path)));
    if let Ok(v) = HeaderValue::from_str(&cache) {
        h.insert(header::CACHE_CONTROL, v);
    }
    response
}

/// Basic (AUTHENTICATION_USER / AUTHENTICATION_PASSWORD) or bearer (AUTHENTICATION_TOKEN), each when enabled.
fn authorized(state: &AppState, headers: &HeaderMap) -> bool {
    let env = |k: &str| state.config.raw.get(k).filter(|v| !v.is_empty());
    let on = |k: &str| env(k).is_some_and(|v| v == "true" || v == "1");
    let Some(auth) = headers.get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()) else {
        return false;
    };
    if on("ENABLE_BASIC_AUTHENTICATION")
        && let Some(encoded) = auth.strip_prefix("Basic ")
        && let Ok(decoded) = base64::engine::general_purpose::STANDARD.decode(encoded.trim())
        && let (Some(user), Some(password)) = (env("AUTHENTICATION_USER"), env("AUTHENTICATION_PASSWORD"))
        && decoded == format!("{user}:{password}").into_bytes()
    {
        return true;
    }
    on("ENABLE_BEARER_AUTHENTICATION")
        && auth.strip_prefix("Bearer ").is_some_and(|t| env("AUTHENTICATION_TOKEN").is_some_and(|e| e == t.trim()))
}

async fn upload(State(state): State<AppState>, headers: HeaderMap, mut form: Multipart) -> Response {
    if !authorized(&state, &headers) {
        return (StatusCode::UNAUTHORIZED, [(header::WWW_AUTHENTICATE, "Basic realm=\"Users\"")], "Unauthorized")
            .into_response();
    }
    let (mut zip, mut directory) = (None, String::new());
    loop {
        match form.next_field().await {
            Ok(Some(field)) => match field.name() {
                Some("file") => zip = field.bytes().await.ok().map(|b| b.to_vec()),
                Some("directory") => directory = field.text().await.unwrap_or_default(),
                _ => {}
            },
            Ok(None) => break,
            Err(e) => return (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
        }
    }
    let Some(zip) = zip else {
        return (StatusCode::BAD_REQUEST, "No file uploaded").into_response();
    };
    if directory.contains("..") {
        return (StatusCode::BAD_REQUEST, "Invalid directory").into_response();
    }
    if let Err((status, message)) = state.storage.upload(directory, zip).await {
        return (status, message).into_response();
    }
    // Like the backs on handleMapStorageUploadMapDetected: rooms drop their copy and send their users back in.
    for room in state.rooms.live() {
        let _ = room.send(RoomCmd::MapsUploaded).await;
    }
    "File successfully uploaded.".into_response()
}
