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

fn main() {
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
    let state = AppState::new(config);
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

    axum::serve(listener, router(state).into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("HTTP server");
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
