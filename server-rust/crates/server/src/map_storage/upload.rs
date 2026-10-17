//! `POST /upload` of a zip and `GET /download` of a directory (UploadController).

use std::io::{Read, Write};
use std::path::Path;

use axum::extract::{Multipart, Query, State};
use axum::http::{HeaderMap, StatusCode, header};
use axum::response::{IntoResponse, Response};
use serde_json::{Map, Value};
use wa_core::wam::Wam;

use super::{MAX_UPLOAD, MapChange, Refusal, notify, unauthorized, validation_error};
use crate::AppState;

pub(super) async fn upload(State(state): State<AppState>, headers: HeaderMap, mut form: Multipart) -> Response {
    if let Some(refused) = unauthorized(&state, &headers).await {
        return refused;
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
    let directory = match super::domain_dir(&state, &headers, true) {
        Some(dir) => format!("{dir}{}", directory.trim_start_matches('/')),
        None => return super::invalid_domain(),
    };
    // A28: the WAM a map uploaded without one starts from, if the admin gives one.
    let template = match state.config.raw.get("WAM_TEMPLATE_URL").filter(|v| !v.is_empty()) {
        Some(url) => match state.http.get(url).timeout(std::time::Duration::from_secs(10)).send().await.and_then(reqwest::Response::error_for_status) {
            Ok(r) => match r.bytes().await {
                Ok(b) => Some(b.to_vec()),
                Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
            },
            Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Could not get the WAM template: {e}")).into_response(),
        },
        None => None,
    };
    let dir = directory.clone();
    let result = state
        .storage
        .change(&[directory.as_str()], move |root| {
            let target = super::resolve(root, &dir).ok_or((StatusCode::BAD_REQUEST, "Invalid directory".to_owned()))?;
            unpack(&target, &zip, template.as_deref())
        })
        .await;
    match result {
        Ok(None) => {
            // Like the backs on handleMapStorageUploadMapDetected: rooms drop their copy and their users refresh.
            notify(&state, MapChange::Replaced(directory)).await;
            "File successfully uploaded.".into_response()
        }
        Ok(Some(errors)) => (StatusCode::BAD_REQUEST, axum::Json(errors)).into_response(),
        Err((status, message)) => (status, message).into_response(),
    }
}

/// The zip's files, skipping directories and anything under a name starting with a dot.
pub(super) fn entries(zip: &[u8]) -> Result<Vec<(String, Vec<u8>)>, Refusal> {
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

/// Whether a JSON text is a Tiled map (ITiledMap), which must not be uploaded as `.json`.
// ponytail: the fields every Tiled map has, not the whole ITiledMap schema.
fn looks_like_map(v: &Value) -> bool {
    v["layers"].is_array() && v["tilesets"].is_array() && v["tilewidth"].is_number() && v["tileheight"].is_number()
}

/// MapValidator at the "error" level, on what this server checks: Tiled maps in `.json`, unreadable maps,
/// tilesets that are image collections or whose image is not in the upload, and invalid WAM files.
fn validate(files: &[(String, Vec<u8>)]) -> Map<String, Value> {
    let has = |name: &str| files.iter().any(|(n, _)| n == name);
    let mut errors = Map::new();
    for (name, bytes) in files {
        let json = || serde_json::from_slice::<Value>(bytes).ok();
        if name.ends_with(".json") && json().is_some_and(|v| looks_like_map(&v)) {
            let message = r#"Invalid file extension. Maps should end with the ".tmj" extension."#;
            errors.insert(name.clone(), validation_error("map", message, ""));
        } else if name.ends_with(".wam") {
            if let Err(details) = Wam::parse(bytes).ok_or("Not a JSON object".to_owned()).and_then(|w| w.check()) {
                errors.insert(name.clone(), validation_error("map", "Invalid WAM file format.", &details));
            }
        } else if name.ends_with(".tmj") {
            let Some(map) = json() else {
                errors.insert(name.clone(), validation_error("map", "Invalid JSON in the map file.", ""));
                continue;
            };
            let dir = name.rsplit_once('/').map_or("", |(d, _)| d);
            let mut tilesets = Vec::new();
            for t in map["tilesets"].as_array().into_iter().flatten() {
                let tname = t["name"].as_str().unwrap_or_default();
                if t.get("source").is_some() {
                    continue;
                }
                let Some(image) = t["image"].as_str() else {
                    let message = format!(r#"The tileset "{tname}" is a collection of images. Collection of images are not supported."#);
                    tilesets.push(serde_json::json!({"type": "error", "message": message, "details": ""}));
                    continue;
                };
                let remote = image.starts_with("http://") || image.starts_with("https://");
                if !remote && !has(&normalize(dir, image)) {
                    let message = format!(r#"Image of the tileset "{tname}": "{image}" is not loadable."#);
                    tilesets.push(serde_json::json!({"type": "error", "message": message, "details": "", "link": ""}));
                }
            }
            if !tilesets.is_empty() {
                errors.insert(name.clone(), serde_json::json!({ "tilesets": tilesets }));
            }
        }
    }
    errors
}

/// `dir` + a relative path, with `.` and `..` resolved.
fn normalize(dir: &str, rel: &str) -> String {
    let mut parts: Vec<&str> = dir.split('/').filter(|p| !p.is_empty()).collect();
    for p in rel.split('/') {
        match p {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            p => parts.push(p),
        }
    }
    parts.join("/")
}

/// Clears the directory and unpacks the zip into it, unless validation fails: then the errors, and nothing
/// changes.
fn unpack(dir: &Path, zip: &[u8], template: Option<&[u8]>) -> Result<Option<Map<String, Value>>, Refusal> {
    let files = entries(zip)?;
    let errors = validate(&files);
    if !errors.is_empty() {
        return Ok(Some(errors));
    }
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
        super::write_atomic(&dir.join(name), bytes).map_err(io)?;
    }
    for (name, tmj) in files.iter().filter(|(n, _)| n.ends_with(".tmj")) {
        let wam = dir.join(name.replace(".tmj", ".wam"));
        if !wam.exists() {
            let map_url = format!("./{}", name.rsplit('/').next().unwrap_or(name));
            let fresh = match template {
                Some(t) => Wam::fresh_from_template(t, &map_url, tmj)
                    .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Invalid WAM template".to_owned()))?,
                None => Wam::fresh(&map_url, tmj),
            };
            std::fs::write(&wam, fresh.to_json()).map_err(io)?;
        }
    }
    Ok(None)
}

#[derive(serde::Deserialize)]
pub(super) struct DownloadQuery {
    directory: Option<String>,
}

/// `GET /download?directory=`: the directory as a zip, paths relative to it.
pub(super) async fn download(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<DownloadQuery>,
) -> Response {
    if let Some(refused) = unauthorized(&state, &headers).await {
        return refused;
    }
    let directory = q.directory.unwrap_or_default();
    let scoped = match super::domain_dir(&state, &headers, true) {
        Some(dir) => format!("{dir}{}", directory.trim_start_matches('/')),
        None => return super::invalid_domain(),
    };
    let Some(dir) = state.storage.path(&scoped) else {
        return (StatusCode::BAD_REQUEST, "Invalid directory").into_response();
    };
    let zipped = tokio::task::spawn_blocking(move || zip_dir(&dir)).await;
    let Ok(Ok(bytes)) = zipped else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Could not create the archive").into_response();
    };
    let base = directory.trim_matches('/').rsplit('/').next().filter(|b| !b.is_empty()).unwrap_or("map");
    let disposition = format!("attachment; filename=\"{base}.zip\"");
    ([(header::CONTENT_TYPE, "application/zip".to_owned()), (header::CONTENT_DISPOSITION, disposition)], bytes)
        .into_response()
}

fn zip_dir(dir: &Path) -> zip::result::ZipResult<Vec<u8>> {
    let mut zip = zip::ZipWriter::new(std::io::Cursor::new(Vec::new()));
    let mut stack = vec![dir.to_path_buf()];
    while let Some(d) = stack.pop() {
        for e in std::fs::read_dir(&d)?.flatten() {
            let path = e.path();
            let name = e.file_name().to_string_lossy().into_owned();
            if name.starts_with('.') || name == "__cache.json" || name.ends_with(".tmp") {
                continue;
            }
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            let rel = path.strip_prefix(dir).unwrap_or(&path).to_string_lossy().replace('\\', "/");
            zip.start_file(rel, zip::write::SimpleFileOptions::default())?;
            zip.write_all(&std::fs::read(&path)?)?;
        }
    }
    Ok(zip.finish()?.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_map_with_a_missing_tileset_image_or_a_json_extension_is_refused() {
        let map = |image: &str| {
            serde_json::json!({"layers": [], "tilewidth": 32, "tileheight": 32,
                "tilesets": [{"name": "t", "image": image}]})
            .to_string()
            .into_bytes()
        };
        let files = vec![
            ("maps/ok.tmj".to_owned(), map("../assets/t.png")),
            ("assets/t.png".to_owned(), vec![1]),
            ("maps/missing.tmj".to_owned(), map("nope.png")),
            ("maps/map.json".to_owned(), map("../assets/t.png")),
            ("maps/bad.wam".to_owned(), b"[]".to_vec()),
        ];
        let errors = validate(&files);
        assert_eq!(errors.len(), 3, "{errors:?}");
        assert_eq!(errors["maps/missing.tmj"]["tilesets"][0]["type"], "error");
        assert_eq!(
            errors["maps/map.json"]["map"][0]["message"],
            r#"Invalid file extension. Maps should end with the ".tmj" extension."#
        );
        assert_eq!(errors["maps/bad.wam"]["map"][0]["message"], "Invalid WAM file format.");
        assert_eq!(normalize("maps/sub", "../../assets/./t.png"), "assets/t.png");
    }
}
