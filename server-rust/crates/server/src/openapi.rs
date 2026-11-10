//! The OpenAPI documentation (ENABLE_OPENAPI_ENDPOINT): the pusher's documents, generated from its sources by
//! tools/gen-openapi.sh and embedded, and the Swagger UI page. The UI's scripts come from a pinned copy of
//! swagger-ui-dist on a CDN (the pusher serves them from its node_modules, which this image does not have).

use axum::Router;
use axum::extract::State;
use axum::http::header;
use axum::response::{Html, IntoResponse, Response};
use axum::routing::get;

use crate::AppState;

const PUSHER: &str = include_str!("../openapi/pusher.json");
const ADMIN: &str = include_str!("../openapi/admin.json");
const UI: &str = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.6";

pub fn routes(state: &AppState) -> Router<AppState> {
    if !matches!(state.config.raw.get("ENABLE_OPENAPI_ENDPOINT").map(String::as_str), Some("true" | "1")) {
        return Router::new();
    }
    Router::new()
        .route("/openapi/pusher", get(|| async { json(PUSHER.to_owned()) }))
        .route("/openapi/admin", get(admin))
        .route("/swagger-ui/", get(ui))
}

fn json(body: String) -> Response {
    ([(header::CONTENT_TYPE, "application/json; charset=utf-8")], body).into_response()
}

/// With ADMIN_URL, the document names the host the admin reaches the pusher at.
async fn admin(State(state): State<AppState>) -> Response {
    let Some(admin_url) = state.config.raw.get("ADMIN_URL").filter(|v| !v.is_empty()) else {
        return json(ADMIN.to_owned());
    };
    let Ok(mut doc) = serde_json::from_str::<serde_json::Value>(ADMIN) else { return json(ADMIN.to_owned()) };
    doc["host"] = format!("pusher.{}", admin_url.replacen("//", "", 1)).into();
    json(doc.to_string())
}

async fn ui() -> Html<String> {
    let urls = r#"[{"url":"/openapi/pusher","name":"Front -> Pusher <- Admin"},{"url":"/openapi/admin","name":"Pusher -> Admin"}]"#;
    Html(format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Swagger UI</title>
<link rel="stylesheet" href="{UI}/swagger-ui.css">
<link rel="icon" type="image/png" href="{UI}/favicon-32x32.png" sizes="32x32">
</head>
<body>
<div id="swagger-ui"></div>
<script src="{UI}/swagger-ui-bundle.js" charset="UTF-8"></script>
<script src="{UI}/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
<script charset="UTF-8">window.onload = function() {{
    window.ui = SwaggerUIBundle({{
        urls: {urls}, "urls.primaryName": "Pusher -> Admin",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout"
    }});
}};</script>
</body>
</html>"#
    ))
}
