use std::net::SocketAddr;

use wa_server::config::{Config, Env};
use wa_server::metrics::METRICS;
use wa_server::{AppState, http, router};

/// Worker threads follow the CPU quota of the container: `available_parallelism` reads the cgroup limit on
/// Linux (`docker run --cpus=2` gives 2). TOKIO_WORKER_THREADS overrides it.
fn worker_threads() -> usize {
    std::env::var("TOKIO_WORKER_THREADS")
        .ok()
        .and_then(|v| v.parse().ok())
        .filter(|&n| n > 0)
        .unwrap_or_else(|| std::thread::available_parallelism().map_or(1, |n| n.get()))
}

/// `healthcheck`: GET 127.0.0.1:<port>/ping, exit 0 when it answers pong (the image has no curl nor shell).
fn healthcheck() -> ! {
    use std::io::{Read, Write};
    let port = ["SERVER_HTTP_PORT", "PUSHER_HTTP_PORT"]
        .iter()
        .find_map(|k| std::env::var(k).ok().and_then(|v| v.parse::<u16>().ok()))
        .unwrap_or(3000);
    let ok = (|| -> std::io::Result<bool> {
        let timeout = std::time::Duration::from_secs(3);
        let mut s = std::net::TcpStream::connect_timeout(&SocketAddr::from(([127, 0, 0, 1], port)), timeout)?;
        s.set_read_timeout(Some(timeout))?;
        s.write_all(b"GET /ping HTTP/1.0\r\nHost: localhost\r\n\r\n")?;
        let mut answer = String::new();
        s.read_to_string(&mut answer)?;
        Ok(answer.starts_with("HTTP/1.1 200") || answer.starts_with("HTTP/1.0 200"))
    })()
    .unwrap_or(false);
    std::process::exit(if ok { 0 } else { 1 })
}

fn main() {
    if std::env::args().nth(1).as_deref() == Some("healthcheck") {
        healthcheck();
    }
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    let config = match Config::load(Env::from_process()) {
        Ok(config) => config,
        Err(errors) => {
            eprintln!("\n-----------------------------------------");
            eprintln!("FATAL ERRORS FOUND IN ENVIRONMENT VARIABLES!!!");
            eprintln!("-----------------------------------------");
            for e in errors {
                eprintln!("{e}");
            }
            std::process::exit(1);
        }
    };

    let workers = worker_threads();
    METRICS.worker_threads.set(workers as i64);
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(workers)
        // Blocking work (map parsing, uploads, S3) goes to spawn_blocking: keep that pool bounded too.
        .max_blocking_threads(64)
        .enable_all()
        .build()
        .expect("tokio runtime");
    tracing::info!(workers, "starting");
    runtime.block_on(serve(config));
}

async fn serve(config: Config) {
    let mut state = AppState::new(config);
    // Like the pusher and the back: nothing listens before the admin gave its capabilities.
    state.admin = wa_server::admin_api::AdminApi::connect(&state.config, state.http.clone()).await;
    if let Some(admin) = &state.admin {
        state.page_script = wa_server::front::script(&state.config, Some(&admin.capabilities));
        state.analytics = wa_server::analytics::Analytics::new(&state.config, admin, state.http.clone());
        if let Some(a) = &state.analytics {
            a.spawn(&state.config);
        }
    }
    tokio::spawn(wa_server::front::poll_template(state.clone()));
    let addr = SocketAddr::from(([0, 0, 0, 0], state.config.http_port));
    let listener = tokio::net::TcpListener::bind(addr).await.expect("bind HTTP port");
    tracing::info!(%addr, "HTTP and WebSocket server listening");

    if state.config.prometheus_port != 0 {
        let addr = SocketAddr::from(([0, 0, 0, 0], state.config.prometheus_port));
        let listener = tokio::net::TcpListener::bind(addr).await.expect("bind PROMETHEUS_PORT");
        let app = http::prometheus_routes().with_state(state.clone());
        tokio::spawn(async move { axum::serve(listener, app).await });
    }

    let addr = SocketAddr::from(([0, 0, 0, 0], state.config.map_storage_port));
    let maps = tokio::net::TcpListener::bind(addr).await.expect("bind SERVER_MAP_STORAGE_PORT");
    tracing::info!(%addr, dir = %state.config.storage_directory, "map-storage listening");
    let app = wa_server::map_storage::router(state.clone());
    tokio::spawn(async move { axum::serve(maps, app).await });

    if wa_server::room_api::enabled(&state) {
        let port = state.config.raw.get("ROOM_API_PORT").and_then(|p| p.parse().ok()).unwrap_or(50051u16);
        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        let grpc = tokio::net::TcpListener::bind(addr).await.expect("bind ROOM_API_PORT");
        tracing::info!(%addr, "Room API listening");
        let app = tonic::service::Routes::new(wa_server::room_api::service(state.clone())).into_axum_router();
        tokio::spawn(async move { axum::serve(grpc, app).await });
    }

    if state.config.uploader_port != 0 {
        let addr = SocketAddr::from(([0, 0, 0, 0], state.config.uploader_port));
        let uploads = tokio::net::TcpListener::bind(addr).await.expect("bind SERVER_UPLOADER_PORT");
        tracing::info!(%addr, "uploader listening");
        let app = wa_server::uploader::router(state.clone());
        tokio::spawn(async move { axum::serve(uploads, app).await });
    }

    if state.config.ws_port != 0 && state.config.ws_port != state.config.http_port {
        let addr = SocketAddr::from(([0, 0, 0, 0], state.config.ws_port));
        let ws = tokio::net::TcpListener::bind(addr).await.expect("bind PUSHER_WS_PORT");
        tracing::info!(%addr, "WebSocket port listening");
        let app = router(state.clone()).into_make_service_with_connect_info::<SocketAddr>();
        tokio::spawn(async move { axum::serve(ws, app).await });
    }

    let stopping = state.clone();
    axum::serve(listener, router(state).into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("HTTP server");
    // Like the pusher and the back on SIGTERM: open intervals end, then what is queued goes out.
    stopping.shutdown.send_replace(true);
    if let Some(a) = &stopping.analytics {
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        let drain = stopping.config.raw.get("DRAIN_TIMEOUT_MS").and_then(|v| v.parse().ok()).unwrap_or(20_000);
        a.drain(std::time::Duration::from_millis(drain)).await;
    }
}

async fn shutdown_signal() {
    let ctrl_c = tokio::signal::ctrl_c();
    #[cfg(unix)]
    {
        let mut term = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()).expect("SIGTERM");
        tokio::select! {
            _ = ctrl_c => {},
            _ = term.recv() => {},
        }
    }
    #[cfg(not(unix))]
    let _ = ctrl_c.await;
}
