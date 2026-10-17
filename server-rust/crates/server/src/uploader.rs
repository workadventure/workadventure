//! The uploader (SERVER_UPLOADER_PORT, 3003): the files and voice messages of the chat, kept in Redis on
//! REDIS_DB_NUMBER (RedisStorageProvider). Files are stored under a fresh UUID with a sanitized extension, and
//! served back as inert content: only images, audio and video keep their type, nothing is ever rendered as a
//! document on the uploader origin.
//!
//! S3 storage (AWS_BUCKET) is not here yet: without Redis, uploads are refused, as with NullStorageProvider.

use std::time::Duration;

use axum::Router;
use axum::extract::{DefaultBodyLimit, Multipart, Path, State};
use axum::http::{HeaderValue, Method, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use redis::AsyncCommands;
use redis::aio::ConnectionManager;
use serde_json::json;

use crate::AppState;

/// UPLOAD_MAX_FILESIZE, or 100 MB.
fn max_size(state: &AppState) -> usize {
    state.config.raw.get("UPLOAD_MAX_FILESIZE").and_then(|v| v.parse().ok()).filter(|n| *n > 0).unwrap_or(100 << 20)
}

pub fn router(state: AppState) -> Router {
    let conn = crate::redis_store::connect(&state.config, state.config.raw.get("REDIS_DB_NUMBER").map(String::as_str));
    let origin = ["ALLOWED_CORS_ORIGIN", "PLAY_URL"]
        .iter()
        .find_map(|k| state.config.raw.get(*k).filter(|v| !v.is_empty()).cloned())
        .unwrap_or_else(|| "*".into());
    let limit = max_size(&state);
    Router::new()
        .route("/ping", get(|| async { "pong" }))
        .route("/upload-audio-message", post(upload_audio))
        .route("/download-audio-message/{id}", get(download_audio))
        .route("/upload-file", post(upload_file))
        .route("/upload-file/{id}", get(download_file))
        .layer(DefaultBodyLimit::max(limit + 64 * 1024))
        .layer(axum::middleware::from_fn(move |req: axum::extract::Request, next: axum::middleware::Next| {
            let origin = origin.clone();
            async move {
                let preflight = req.method() == Method::OPTIONS;
                let mut response = if preflight { StatusCode::NO_CONTENT.into_response() } else { next.run(req).await };
                let h = response.headers_mut();
                if let Ok(o) = HeaderValue::from_str(&origin) {
                    h.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, o);
                }
                if preflight {
                    h.insert(header::ACCESS_CONTROL_ALLOW_METHODS, HeaderValue::from_static("GET,HEAD,PUT,PATCH,POST,DELETE"));
                    h.insert(header::ACCESS_CONTROL_ALLOW_HEADERS, HeaderValue::from_static("*"));
                }
                response
            }
        }))
        .with_state(Uploader { app: state, conn })
}

#[derive(Clone)]
struct Uploader {
    app: AppState,
    conn: Option<ConnectionManager>,
}

/// MimeTypeManager.getExtensionByFileName: the last part, lowercase, 1 to 12 alphanumerics.
fn extension(name: &str) -> Option<String> {
    let (_, ext) = name.rsplit_once('.')?;
    let ext = ext.to_ascii_lowercase();
    (!ext.is_empty() && ext.len() <= 12 && ext.bytes().all(|b| b.is_ascii_alphanumeric())).then_some(ext)
}

/// getSafeMimeTypeByFileName: images (not SVG), audio and video keep their type, the rest is a binary blob.
fn safe_type(name: &str) -> &'static str {
    // ponytail: the common media extensions, not the whole mime-db; anything else downloads as binary.
    match extension(name).as_deref() {
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("avif") => "image/avif",
        Some("bmp") => "image/bmp",
        Some("ico") => "image/x-icon",
        Some("mp3") => "audio/mpeg",
        Some("wav") => "audio/wav",
        Some("ogg" | "oga") => "audio/ogg",
        Some("opus") => "audio/opus",
        Some("m4a") => "audio/mp4",
        Some("aac") => "audio/aac",
        Some("flac") => "audio/flac",
        Some("weba") => "audio/webm",
        Some("mp4" | "m4v") => "video/mp4",
        Some("webm") => "video/webm",
        Some("ogv") => "video/ogg",
        Some("mov") => "video/quicktime",
        _ => "application/octet-stream",
    }
}

fn unavailable() -> Response {
    (StatusCode::INTERNAL_SERVER_ERROR, "S3 and Redis for upload file are not defined").into_response()
}

/// HttpResponseDevice.copyFromBuffer.
fn serve(id: &str, bytes: Option<Vec<u8>>, attachment: bool) -> Response {
    let Some(bytes) = bytes else {
        return (StatusCode::NOT_FOUND, "Cannot find file").into_response();
    };
    let mut response = (
        [
            (header::CONTENT_TYPE, safe_type(id)),
            (header::X_CONTENT_TYPE_OPTIONS, "nosniff"),
            (header::CONTENT_SECURITY_POLICY, "default-src 'none'; sandbox"),
        ],
        bytes,
    )
        .into_response();
    if attachment {
        response.headers_mut().insert(header::CONTENT_DISPOSITION, HeaderValue::from_static("attachment"));
    }
    response
}

async fn upload_audio(State(u): State<Uploader>, mut form: Multipart) -> Response {
    let Some(mut conn) = u.conn.clone() else { return unavailable() };
    let mut file = None;
    while let Ok(Some(field)) = form.next_field().await {
        if field.name() == Some("file") {
            file = field.bytes().await.ok();
        }
    }
    let Some(file) = file else {
        return (StatusCode::BAD_REQUEST, "No files were uploaded.").into_response();
    };
    let id = uuid::Uuid::new_v4().to_string();
    if let Err(e) = conn.set_ex::<_, _, ()>(&id, file.to_vec(), 60).await {
        tracing::error!(error = %e, "could not store a voice message");
        return (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error").into_response();
    }
    axum::Json(json!({"id": id, "path": format!("/download-audio-message/{id}")})).into_response()
}

async fn download_audio(State(u): State<Uploader>, Path(id): Path<String>) -> Response {
    let Some(mut conn) = u.conn.clone() else { return unavailable() };
    match conn.get::<_, Option<Vec<u8>>>(&id).await {
        Ok(bytes) => serve(&id, bytes, false),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error").into_response(),
    }
}

async fn download_file(State(u): State<Uploader>, Path(id): Path<String>) -> Response {
    let Some(mut conn) = u.conn.clone() else { return unavailable() };
    match conn.get::<_, Option<Vec<u8>>>(&id).await {
        Ok(bytes) => serve(&id, bytes, true),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error").into_response(),
    }
}

/// `POST /upload-file`: every file of the form; the admin (ADMIN_API_URL) says whether its size is allowed for
/// that user, otherwise ENABLE_CHAT_UPLOAD and UPLOAD_MAX_FILESIZE decide.
async fn upload_file(State(u): State<Uploader>, mut form: Multipart) -> Response {
    let config = &u.app.config;
    let (mut files, mut token) = (Vec::new(), None);
    loop {
        match form.next_field().await {
            Ok(Some(field)) => {
                if field.name() == Some("userRoomToken") {
                    token = field.text().await.ok();
                } else if let Some(name) = field.file_name().map(str::to_owned) {
                    let mime = field.content_type().map(str::to_owned);
                    match field.bytes().await {
                        Ok(bytes) => files.push((name, mime, bytes)),
                        Err(_) => {
                            let max = max_size(&u.app).to_string();
                            return (StatusCode::PAYLOAD_TOO_LARGE, axum::Json(json!({"message": "file-too-big", "maxFileSize": max})))
                                .into_response();
                        }
                    }
                }
            }
            Ok(None) => break,
            Err(e) => return (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
        }
    }
    if files.is_empty() {
        return (StatusCode::BAD_REQUEST, "No files were uploaded.").into_response();
    }
    let refuse = |status: StatusCode, body: serde_json::Value| (status, axum::Json(body)).into_response();
    let admin = config.raw.get("ADMIN_API_URL").filter(|v| !v.is_empty());
    let limit = config.raw.get("UPLOAD_MAX_FILESIZE").cloned();
    let enabled = !matches!(config.raw.get("ENABLE_CHAT_UPLOAD").map(|v| v.to_lowercase()).as_deref(), Some("false" | "0"));
    for (_, _, bytes) in &files {
        match admin {
            Some(admin) => {
                let Some(token) = token.as_deref() else {
                    return refuse(StatusCode::UNAUTHORIZED, json!({"message": "not-logged"}));
                };
                let asked = u
                    .app
                    .http
                    .get(format!("{admin}/api/limit/fileSize"))
                    .header("userRoomToken", token)
                    .query(&[("fileSize", bytes.len())])
                    .timeout(Duration::from_secs(10))
                    .send()
                    .await;
                match asked {
                    Ok(r) if r.status().is_success() => {}
                    Ok(r) => {
                        let status = match r.status().as_u16() {
                            413 => StatusCode::PAYLOAD_TOO_LARGE,
                            423 => StatusCode::LOCKED,
                            _ => StatusCode::UNAUTHORIZED,
                        };
                        let body: serde_json::Value = r.json().await.unwrap_or_default();
                        return refuse(status, json!({"message": body["message"], "maxFileSize": body["maxFileSize"]}));
                    }
                    Err(e) => {
                        tracing::error!(error = %e, "the admin did not answer the file size check");
                        return (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error").into_response();
                    }
                }
            }
            None if !enabled => return refuse(StatusCode::UNAUTHORIZED, json!({"message": "disabled"})),
            None => {
                if let Some(max) = limit.as_deref().and_then(|l| l.parse::<usize>().ok())
                    && bytes.len() > max
                {
                    return refuse(StatusCode::PAYLOAD_TOO_LARGE, json!({"message": "file-too-big", "maxFileSize": limit}));
                }
            }
        }
    }
    let Some(mut conn) = u.conn.clone() else { return unavailable() };
    let base = config.raw.get("UPLOADER_URL").cloned().unwrap_or_default();
    let mut uploaded = Vec::new();
    for (name, mime, bytes) in files {
        let id = match extension(&name) {
            Some(ext) => format!("{}.{ext}", uuid::Uuid::new_v4()),
            None => uuid::Uuid::new_v4().to_string(),
        };
        if let Err(e) = conn.set::<_, _, ()>(&id, bytes.to_vec()).await {
            tracing::error!(error = %e, "could not store an uploaded file");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error").into_response();
        }
        uploaded.push(json!({
            "name": name, "id": id, "location": format!("{base}/upload-file/{id}"), "size": bytes.len(),
            "lastModified": iso_now(), "type": mime,
        }));
    }
    axum::Json(uploaded).into_response()
}

/// `new Date()` as JSON writes it.
pub fn iso_now() -> String {
    let ms = crate::redis_store::now_ms();
    let (secs, millis) = (ms / 1000, ms % 1000);
    let (days, rem) = (secs / 86_400, secs % 86_400);
    // Civil date from days since 1970-01-01 (Howard Hinnant's algorithm).
    let z = days as i64 + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    format!("{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}.{millis:03}Z", rem / 3600, rem % 3600 / 60, rem % 60)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uploaded_names_never_choose_a_dangerous_type() {
        assert_eq!(extension("photo.JPG").as_deref(), Some("jpg"));
        assert_eq!(extension("x.tar.gz").as_deref(), Some("gz"));
        assert_eq!(extension("noext"), None);
        assert_eq!(extension("a.<script>"), None);
        assert_eq!(safe_type("a.png"), "image/png");
        assert_eq!(safe_type("a.svg"), "application/octet-stream");
        assert_eq!(safe_type("a.html"), "application/octet-stream");
        assert!(iso_now().ends_with('Z') && iso_now().len() == 24);
    }
}
