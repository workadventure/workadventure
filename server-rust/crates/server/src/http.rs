//! Plain HTTP routes: health and metrics.

use axum::Router;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode, header};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum::routing::get;

use crate::AppState;
use crate::metrics;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/ping", get(|| async { "pong" }))
        .route("/ready", get(ready))
        .route("/api-version", get(api_version))
        .route("/metrics", get(main_port_metrics))
}

/// The router of PROMETHEUS_PORT, when it is set.
pub fn prometheus_routes() -> Router<AppState> {
    Router::new().route("/metrics", get(prometheus_port_metrics))
}

async fn ready(State(state): State<AppState>) -> Response {
    if state.is_ready() {
        "ready".into_response()
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, "not ready").into_response()
    }
}

/// The protocol hash (apiVersionHash) the front must match: the SaaS pipeline checks it against the front.
async fn api_version(State(state): State<AppState>) -> Response {
    match state.front.api_version() {
        Some(v) => v.into_response(),
        None => (StatusCode::SERVICE_UNAVAILABLE, "unknown until the front template is loaded").into_response(),
    }
}

async fn main_port_metrics(State(state): State<AppState>, headers: HeaderMap) -> Response {
    // Same rule as the pusher: on the public port, metrics need either a dedicated port or a token.
    if state.config.prometheus_port == 0 && state.config.prometheus_token.is_none() {
        return (StatusCode::NOT_IMPLEMENTED, "Prometheus endpoint is disabled.").into_response();
    }
    serve_metrics(&state, &headers)
}

async fn prometheus_port_metrics(State(state): State<AppState>, headers: HeaderMap) -> Response {
    serve_metrics(&state, &headers)
}

fn serve_metrics(state: &AppState, headers: &HeaderMap) -> Response {
    if let Some(token) = &state.config.prometheus_token {
        let Some(auth) = headers.get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()) else {
            return (StatusCode::UNAUTHORIZED, "Undefined authorization header").into_response();
        };
        let Some(sent) = auth.strip_prefix("Bearer ") else {
            return (StatusCode::UNAUTHORIZED, "Authorization header should start with \"Bearer\"").into_response();
        };
        if sent != token {
            return (StatusCode::UNAUTHORIZED, "Incorrect authorization header sent.").into_response();
        }
    }
    let (content_type, body) = metrics::render();
    ([(header::CONTENT_TYPE, content_type)], body).into_response()
}

/// The pusher's cors() middleware: ALLOWED_CORS_ORIGIN, where "*" reflects the caller's origin; "*" when unset.
pub async fn cors(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let allowed = state.config.raw.get("ALLOWED_CORS_ORIGIN").map(String::as_str).unwrap_or_default();
    let origin = request.headers().get(header::ORIGIN).cloned();
    let preflight =
        request.method() == Method::OPTIONS && request.headers().contains_key(header::ACCESS_CONTROL_REQUEST_METHOD);
    let mut response = if preflight { StatusCode::NO_CONTENT.into_response() } else { next.run(request).await };
    let h = response.headers_mut();
    let allow = match (allowed, origin) {
        ("*", Some(o)) => Some(o),
        ("", _) => Some(HeaderValue::from_static("*")),
        (a, _) => HeaderValue::from_str(a).ok(),
    };
    if let Some(a) = allow {
        h.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, a);
        if !allowed.is_empty() {
            h.append(header::VARY, HeaderValue::from_static("Origin"));
        }
    }
    h.insert(header::ACCESS_CONTROL_ALLOW_CREDENTIALS, HeaderValue::from_static("true"));
    if preflight {
        h.insert(header::ACCESS_CONTROL_ALLOW_METHODS, HeaderValue::from_static("GET,POST,OPTIONS,PUT,PATCH,DELETE"));
        h.insert(
            header::ACCESS_CONTROL_ALLOW_HEADERS,
            HeaderValue::from_static(
                "Content-Type,Authorization,Origin,X-Requested-With,Accept,Pragma,Cache-Control,baggage,sentry-trace",
            ),
        );
    }
    response
}
