//! Single files: serving (proxyFiles), PUT, PATCH of a WAM, DELETE, move, copy, the map list, the advertised
//! upload URL and the editor's private files.

use std::path::Path;
use std::time::Duration;

use axum::body::Body;
use axum::extract::{FromRequest, Multipart, Query, Request, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode, header};
use axum::response::{Html, IntoResponse, Response};
use serde_json::{Value, json};
use wa_core::wam::Wam;

use super::{MAX_UPLOAD, MapChange, notify, unauthorized, validation_error, write_atomic};
use crate::custom_entities::link_path;
use crate::{AppState, json_patch, jwt};

/// WAMVersionHash (sha256 of libs/map-editor/src/types.ts): only map-storage compares it, to rebuild its cache.
const WAM_VERSION_HASH: &str = "b4b9b380a22f5062437bc6888d634fc649ca495fe48148720ed527d9ade0aa12";

/// A URL path, decoded. `+` is a space when serving (proxyFiles), not in the paths PathMapper decodes.
fn decode(raw: &str, plus_is_space: bool) -> String {
    let raw = if plus_is_space { raw.replace('+', " ") } else { raw.to_owned() };
    percent_encoding::percent_decode_str(&raw).decode_utf8_lossy().into_owned()
}

/// Everything that is not a named route: serving for reads (and for a POST, as Express falls through to the
/// static files), writes by method.
pub(super) async fn any(State(state): State<AppState>, request: Request) -> Response {
    let raw = request.uri().path().to_owned();
    let method = request.method().clone();
    let rest = !matches!(method, Method::GET | Method::HEAD | Method::POST);
    let dir = match super::domain_dir(&state, request.headers(), rest) {
        Some(dir) => dir,
        None => return super::invalid_domain(),
    };
    match method {
        Method::PUT => put(state, format!("{dir}{}", decode(&raw, false)), request).await,
        Method::PATCH => patch(state, format!("{dir}{}", decode(&raw, false)), request).await,
        Method::DELETE => delete(state, format!("{dir}{}", decode(&raw, false)), request.headers()).await,
        // `GET *.wam` has its own route, which keeps `+` (proxyFiles turns it into a space).
        _ => serve(&state, &format!("{dir}{}", decode(&raw, !raw.ends_with(".wam"))), &raw).await,
    }
}

fn immutable(name: &str) -> bool {
    let hashed = name.rsplit_once('.').is_some_and(|(stem, ext)| {
        (2..=4).contains(&ext.len())
            && ext.chars().all(|c| c.is_ascii_alphabetic())
            && stem.len() > 8
            && stem[stem.len() - 8..].chars().all(|c| c.is_ascii_hexdigit())
            && matches!(stem.as_bytes()[stem.len() - 9], b'.' | b'-')
    });
    let uuid = name.as_bytes().windows(36).any(|w| {
        w.iter().enumerate().all(|(i, c)| match i {
            8 | 13 | 18 | 23 => *c == b'-',
            _ => c.is_ascii_hexdigit(),
        })
    });
    hashed || uuid
}

fn content_type(path: &str) -> &'static str {
    let ext = path.rsplit_once('.').map(|(_, e)| e.to_ascii_lowercase()).unwrap_or_default();
    match ext.as_str() {
        "json" | "tmj" | "tsj" | "wam" => "application/json",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
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
        "zip" => "application/zip",
        _ => "application/octet-stream",
    }
}

async fn serve(state: &AppState, path: &str, raw: &str) -> Response {
    if path.contains("..") {
        return (StatusCode::BAD_REQUEST, "Invalid path").into_response();
    }
    let not_found = || (StatusCode::NOT_FOUND, format!("Cannot GET {raw}")).into_response();
    let Some(full) = state.storage.path(path) else { return not_found() };
    let Ok(meta) = tokio::fs::metadata(&full).await else { return not_found() };
    if !meta.is_file() || path.ends_with(".tmp") {
        return not_found();
    }
    let Ok(bytes) = tokio::fs::read(&full).await else { return not_found() };
    let name = path.rsplit('/').next().unwrap_or(path);
    let cache = if path.ends_with(".wam") {
        "max-age=5".to_owned()
    } else if immutable(name) {
        "public, max-age=31536000, immutable".to_owned()
    } else {
        state.config.raw.get("CACHE_CONTROL").cloned().unwrap_or_else(|| "public, s-max-age=10".into())
    };
    let modified =
        meta.modified().ok().and_then(|m| m.duration_since(std::time::UNIX_EPOCH).ok()).map_or(0, |d| d.as_millis());
    let mut response = Response::new(Body::from(bytes));
    let h = response.headers_mut();
    h.insert(header::CONTENT_TYPE, HeaderValue::from_static(content_type(path)));
    if let Ok(v) = HeaderValue::from_str(&cache) {
        h.insert(header::CACHE_CONTROL, v);
    }
    if let Ok(v) = HeaderValue::from_str(&format!("W/\"{:x}-{modified:x}\"", meta.len())) {
        h.insert(header::ETAG, v);
    }
    response
}

fn invalid_wam(details: &str) -> Response {
    (StatusCode::BAD_REQUEST, axum::Json(validation_error("map", "Invalid WAM file format.", details))).into_response()
}

/// `PUT /<path>`: a multipart `file`, or the raw body. A WAM must be valid; its rooms reload.
async fn put(state: AppState, path: String, request: Request) -> Response {
    if let Some(refused) = unauthorized(&state, request.headers()).await {
        return refused;
    }
    if path.contains("..") {
        return (StatusCode::BAD_REQUEST, "Invalid path").into_response();
    }
    let multipart = request
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.starts_with("multipart/form-data"));
    let bytes = if multipart {
        let Ok(mut form) = Multipart::from_request(request, &state).await else {
            return (StatusCode::BAD_REQUEST, "Invalid multipart body").into_response();
        };
        let mut file = None;
        while let Ok(Some(field)) = form.next_field().await {
            if field.name() == Some("file") {
                file = field.bytes().await.ok();
            }
        }
        let Some(file) = file else {
            let refusal = validation_error("request", "No file was uploaded", "");
            return (StatusCode::BAD_REQUEST, axum::Json(refusal)).into_response();
        };
        file.to_vec()
    } else {
        match axum::body::to_bytes(request.into_body(), MAX_UPLOAD).await {
            Ok(b) => b.to_vec(),
            Err(e) => return (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
        }
    };
    let wam = path.ends_with(".wam");
    if wam && let Err(details) = Wam::parse(&bytes).ok_or("Not a JSON object".to_owned()).and_then(|w| w.check()) {
        return invalid_wam(&details);
    }
    let rel = path.clone();
    let written = state
        .storage
        .change(&[path.as_str()], move |root| match super::resolve(root, &rel) {
            Some(full) => write_atomic(&full, &bytes),
            None => Err(std::io::ErrorKind::InvalidInput.into()),
        })
        .await;
    if let Err(e) = written {
        return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response();
    }
    if wam {
        notify(&state, MapChange::Replaced(path)).await;
    }
    "File successfully uploaded.".into_response()
}

/// `PATCH <path>.wam`: a JSON Patch applied to the (migrated) WAM, which must stay valid.
async fn patch(state: AppState, path: String, request: Request) -> Response {
    if let Some(refused) = unauthorized(&state, request.headers()).await {
        return refused;
    }
    if !path.ends_with(".wam") || path.contains("..") {
        return (StatusCode::NOT_FOUND, format!("Cannot PATCH {path}")).into_response();
    }
    let Some(current) = state.storage.read(&path).await else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "File not found").into_response();
    };
    let body = axum::body::to_bytes(request.into_body(), MAX_UPLOAD).await.unwrap_or_default();
    let Ok(Value::Array(ops)) = serde_json::from_slice::<Value>(&body) else {
        let refusal = json!({"patch": "Invalid patch: expected an array of operations"});
        return (StatusCode::BAD_REQUEST, axum::Json(refusal)).into_response();
    };
    let Some(wam) = Wam::parse(&current) else {
        return invalid_wam("The stored file is not a JSON object");
    };
    let mut doc: Value = serde_json::from_slice(&wam.to_json()).unwrap_or_default();
    for key in ["vendor", "metadata"] {
        if doc.get(key).is_none() {
            doc[key] = json!({});
        }
    }
    if let Err(e) = json_patch::apply(&mut doc, &ops) {
        return (StatusCode::BAD_REQUEST, axum::Json(json!({ "patch": e }))).into_response();
    }
    let bytes = doc.to_string().into_bytes();
    if let Err(details) = Wam::parse(&bytes).ok_or("Not a JSON object".to_owned()).and_then(|w| w.check()) {
        return invalid_wam(&details);
    }
    let rel = path.clone();
    let written = state
        .storage
        .change(&[path.as_str()], move |root| super::resolve(root, &rel).map(|full| write_atomic(&full, &bytes)))
        .await;
    if !matches!(written, Some(Ok(()))) {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Could not write the file").into_response();
    }
    notify(&state, MapChange::Replaced(path)).await;
    axum::Json(json!({"success": true})).into_response()
}

/// `DELETE /<path>`: a file or a directory; the root is emptied, not removed. A deleted WAM's users are told.
async fn delete(state: AppState, path: String, headers: &HeaderMap) -> Response {
    if let Some(refused) = unauthorized(&state, headers).await {
        return refused;
    }
    if path.contains("..") {
        return (StatusCode::BAD_REQUEST, "Invalid path").into_response();
    }
    let wam = path.ends_with(".wam");
    if wam && state.storage.read(&path).await.is_none() {
        return (StatusCode::INTERNAL_SERVER_ERROR, "File not found").into_response();
    }
    let rel = path.clone();
    let removed = state
        .storage
        .change(&[path.as_str()], move |root| -> std::io::Result<()> {
            let trimmed = rel.trim_matches('/').trim_start_matches("./");
            if trimmed.is_empty() || trimmed == "." {
                for e in std::fs::read_dir(root)?.flatten() {
                    let p = e.path();
                    if p.is_dir() { std::fs::remove_dir_all(p)? } else { std::fs::remove_file(p)? }
                }
                return Ok(());
            }
            let full = super::resolve(root, trimmed).ok_or(std::io::ErrorKind::InvalidInput)?;
            match std::fs::metadata(&full) {
                Ok(m) if m.is_dir() => std::fs::remove_dir_all(full),
                Ok(_) => std::fs::remove_file(full),
                Err(_) => Ok(()),
            }
        })
        .await;
    if let Err(e) = removed {
        return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response();
    }
    if wam {
        notify(&state, MapChange::Deleted(path)).await;
    }
    StatusCode::NO_CONTENT.into_response()
}

#[derive(serde::Deserialize)]
pub(super) struct SourceDestination {
    source: String,
    destination: String,
}

async fn relocate(state: AppState, headers: HeaderMap, body: axum::body::Bytes, copy: bool) -> Response {
    if let Some(refused) = unauthorized(&state, &headers).await {
        return refused;
    }
    let Ok(SourceDestination { source, destination }) = serde_json::from_slice(&body) else {
        return (StatusCode::BAD_REQUEST, "Invalid request :source and destination are required").into_response();
    };
    if source.contains("..") || destination.contains("..") {
        return (StatusCode::BAD_REQUEST, "Invalid directory").into_response();
    }
    let dir = match super::domain_dir(&state, &headers, true) {
        Some(dir) => dir,
        None => return super::invalid_domain(),
    };
    let (source, destination) =
        (format!("{dir}{}", source.trim_start_matches('/')), format!("{dir}{}", destination.trim_start_matches('/')));
    let prefixes = [source.clone(), destination.clone()];
    let done = state
        .storage
        .change(&[prefixes[0].as_str(), prefixes[1].as_str()], move |root| -> Result<(), (StatusCode, String)> {
            let io = |e: std::io::Error| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string());
            let bad = || (StatusCode::BAD_REQUEST, "Invalid directory".to_owned());
            let from = super::resolve(root, &source).ok_or_else(bad)?;
            let to = super::resolve(root, &destination).ok_or_else(bad)?;
            if to.exists() {
                return Err((StatusCode::CONFLICT, "Destination already exist!".into()));
            }
            if let Some(parent) = to.parent() {
                std::fs::create_dir_all(parent).map_err(io)?;
            }
            if copy { copy_all(&from, &to).map_err(io) } else { std::fs::rename(&from, &to).map_err(io) }
        })
        .await;
    match done {
        Ok(()) if copy => (StatusCode::CREATED, "Created").into_response(),
        Ok(()) => "OK".into_response(),
        Err((status, message)) => (status, message).into_response(),
    }
}

fn copy_all(from: &Path, to: &Path) -> std::io::Result<()> {
    if from.is_dir() {
        std::fs::create_dir_all(to)?;
        for e in std::fs::read_dir(from)?.flatten() {
            copy_all(&e.path(), &to.join(e.file_name()))?;
        }
        Ok(())
    } else {
        std::fs::copy(from, to).map(|_| ())
    }
}

pub(super) async fn move_file(State(state): State<AppState>, headers: HeaderMap, body: axum::body::Bytes) -> Response {
    relocate(state, headers, body, false).await
}

pub(super) async fn copy_file(State(state): State<AppState>, headers: HeaderMap, body: axum::body::Bytes) -> Response {
    relocate(state, headers, body, true).await
}

/// `GET /upload-endpoint`, public: DIRECT_UPLOAD_URL, else this server's own `/upload`. The Host header keeps
/// the port, which map-storage's `req.hostname` drops.
pub(super) async fn upload_endpoint(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let get = |k: &str| headers.get(k).and_then(|v| v.to_str().ok()).filter(|v| !v.is_empty());
    let url = state.config.raw.get("DIRECT_UPLOAD_URL").filter(|v| !v.is_empty()).cloned().unwrap_or_else(|| {
        let proto = get("x-forwarded-proto").unwrap_or("http");
        let host = get("x-forwarded-host").or_else(|| get("host")).unwrap_or("localhost");
        format!("{proto}://{host}{}/upload", get("x-forwarded-prefix").unwrap_or(""))
    });
    axum::Json(json!({ "url": url })).into_response()
}

/// `GET /maps`, public: every WAM file with its map URL, metadata and vendor block.
pub(super) async fn maps(State(state): State<AppState>, headers: HeaderMap) -> Response {
    let dir = match super::domain_dir(&state, &headers, false) {
        Some(dir) => dir,
        None => return super::invalid_domain(),
    };
    // The tenant's maps only, named as it sees them.
    let list: serde_json::Map<String, Value> = state
        .storage
        .wam_list()
        .await
        .into_iter()
        .filter_map(|(rel, entry)| Some((rel.strip_prefix(dir.as_str())?.to_owned(), entry)))
        .collect();
    axum::Json(json!({ "version": WAM_VERSION_HASH, "maps": list })).into_response()
}

#[derive(serde::Deserialize)]
pub(super) struct TokenQuery {
    token: Option<String>,
}

fn refused(status: StatusCode, message: &str) -> Response {
    let page = format!(
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Error</title></head><body><p>{message}</p></body></html>"
    );
    (status, Html(page)).into_response()
}

/// The openFile property pointing to `path`, and the read tags of the area it is in (none: no restriction).
fn find_file(wam: &Value, path: &str) -> Option<Vec<String>> {
    let points_here = |p: &Value| p["type"] == "openFile" && p["link"].as_str().is_some_and(|l| link_path(l) == path);
    for area in wam["areas"].as_array().into_iter().flatten() {
        let props = area["properties"].as_array().map_or(&[][..], Vec::as_slice);
        if props.iter().any(points_here) {
            let tags = props
                .iter()
                .find(|p| p["type"] == "restrictedRightsPropertyData")
                .and_then(|p| p["readTags"].as_array())
                .map(|t| t.iter().filter_map(|t| t.as_str().map(str::to_owned)).collect())
                .unwrap_or_default();
            return Some(tags);
        }
    }
    let in_entity = wam["entities"]
        .as_object()
        .into_iter()
        .flatten()
        .any(|(_, e)| e["properties"].as_array().into_iter().flatten().any(points_here));
    in_entity.then(Vec::new)
}

/// `GET /private/files/*?token=`: a file the editor uploaded, for a holder of a mapStorageJwt whose map links
/// to it, and who may read the area it is in. The map is read from disk: a link just added may need a moment.
pub(super) async fn private_file(
    State(state): State<AppState>,
    Query(q): Query<TokenQuery>,
    request: Request,
) -> Response {
    let Some(token) = q.token.filter(|t| !t.is_empty()) else {
        return refused(StatusCode::FORBIDDEN, "Missing token");
    };
    let Ok(claims) = jwt::open(&state.config.secret_key, &token) else {
        return refused(StatusCode::FORBIDDEN, "Invalid token");
    };
    let (Some(wam_url), Some(tags)) = (claims["wamUrl"].as_str(), claims["tags"].as_array()) else {
        return refused(StatusCode::BAD_REQUEST, "Invalid token content");
    };
    let tags: Vec<&str> = tags.iter().filter_map(Value::as_str).collect();
    // The map the token was made for decides the tenant folder.
    let Some(wam_rel) = super::wam_key_of_url(&state.config, wam_url) else {
        return refused(StatusCode::BAD_REQUEST, "Invalid token content");
    };
    let dir = match reqwest::Url::parse(wam_url).ok().and_then(|u| u.host_str().map(str::to_owned)) {
        Some(host) if state.config.use_domain_name_in_path => super::domain_folder(&host).unwrap_or_default(),
        _ => String::new(),
    };
    let raw = request.uri().path().to_owned();
    let path = decode(&raw, false);
    for _ in 0..32 {
        let wam: Value =
            state.storage.read(&wam_rel).await.and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
        if let Some(read_tags) = find_file(&wam, &path) {
            if !read_tags.is_empty() && !read_tags.iter().any(|t| tags.contains(&t.as_str())) {
                return refused(StatusCode::FORBIDDEN, "You are not allowed to access this file");
            }
            return serve(&state, &format!("{dir}{path}"), &raw).await;
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    refused(StatusCode::FORBIDDEN, "This file is not linked from the map")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hashed_and_uuid_names_are_immutable() {
        assert!(immutable("immutable.a45b7e8f.js"));
        assert!(immutable("x-0123abcd.png"));
        assert!(immutable("img-123e4567-e89b-12d3-a456-426614174000.png"));
        assert!(!immutable("normal-file.js"));
        assert!(!immutable("a45b7e8f.js"));
    }

    #[test]
    fn a_private_file_is_found_with_the_read_tags_of_its_area() {
        let wam = json!({"areas": [{"properties": [
            {"type": "openFile", "link": "http://maps.test:8880/private/files/a%20b-1.pdf"},
            {"type": "restrictedRightsPropertyData", "readTags": ["admin"], "writeTags": []}
        ]}], "entities": {"e": {"properties": [{"type": "openFile", "link": "http://maps.test/private/files/c.pdf"}]}}});
        assert_eq!(find_file(&wam, "/private/files/a b-1.pdf"), Some(vec!["admin".to_owned()]));
        assert_eq!(find_file(&wam, "/private/files/c.pdf"), Some(vec![]));
        assert_eq!(find_file(&wam, "/private/files/x.pdf"), None);
    }
}
