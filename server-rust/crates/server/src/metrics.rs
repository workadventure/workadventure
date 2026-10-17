//! Prometheus metrics. Names, labels and help strings are those of the pusher and back `GaugeManager`, so the
//! existing dashboards keep working. `process_*` metrics come from the process collector (Linux only), like
//! prom-client's default metrics; the `nodejs_*` ones have no equivalent.

use std::sync::LazyLock;

use prometheus::{Encoder, IntCounter, IntCounterVec, IntGauge, IntGaugeVec, Opts, Registry, TextEncoder};

pub struct Metrics {
    pub registry: Registry,
    pub nb_sockets: IntGauge,
    pub nb_clients_per_room: IntGaugeVec,
    pub counter_groups_per_room: IntCounterVec,
    pub nb_groups_per_room: IntGaugeVec,
    pub nb_spaces: IntGauge,
    pub nb_rooms: IntGauge,
    // New in the Rust server.
    pub worker_threads: IntGauge,
    pub slow_consumers: IntCounter,
    pub ws_messages_received: IntCounter,
    pub ws_frames_sent: IntCounter,
}

fn gauge(registry: &Registry, name: &str, help: &str) -> IntGauge {
    let g = IntGauge::new(name, help).expect("valid metric");
    registry.register(Box::new(g.clone())).expect("unique metric");
    g
}

fn counter(registry: &Registry, name: &str, help: &str) -> IntCounter {
    let c = IntCounter::new(name, help).expect("valid metric");
    registry.register(Box::new(c.clone())).expect("unique metric");
    c
}

fn gauge_vec(registry: &Registry, name: &str, help: &str, label: &str) -> IntGaugeVec {
    let g = IntGaugeVec::new(Opts::new(name, help), &[label]).expect("valid metric");
    registry.register(Box::new(g.clone())).expect("unique metric");
    g
}

pub static METRICS: LazyLock<Metrics> = LazyLock::new(|| {
    let registry = Registry::new();
    #[cfg(target_os = "linux")]
    registry
        .register(Box::new(prometheus::process_collector::ProcessCollector::for_self()))
        .expect("process collector");
    let counter_groups_per_room =
        IntCounterVec::new(Opts::new("workadventure_counter_groups_per_room", "Counter of groups per room"), &["room"])
            .expect("valid metric");
    registry.register(Box::new(counter_groups_per_room.clone())).expect("unique metric");
    Metrics {
        nb_sockets: gauge(&registry, "workadventure_nb_sockets", "Number of connected sockets"),
        nb_clients_per_room: gauge_vec(
            &registry,
            "workadventure_nb_clients_per_room",
            "Number of clients per room",
            "room",
        ),
        counter_groups_per_room,
        nb_groups_per_room: gauge_vec(
            &registry,
            "workadventure_nb_groups_per_room",
            "Number of groups per room",
            "room",
        ),
        nb_spaces: gauge(&registry, "workadventure_nb_spaces", "Number of active spaces"),
        nb_rooms: gauge(&registry, "workadventure_nb_rooms", "Number of active rooms"),
        worker_threads: gauge(
            &registry,
            "workadventure_server_worker_threads",
            "Number of async runtime worker threads",
        ),
        slow_consumers: counter(
            &registry,
            "workadventure_server_slow_consumers_total",
            "Sessions closed because their outbound queue overflowed",
        ),
        ws_messages_received: counter(
            &registry,
            "workadventure_server_ws_messages_received_total",
            "WebSocket messages received from clients",
        ),
        ws_frames_sent: counter(
            &registry,
            "workadventure_server_ws_frames_sent_total",
            "WebSocket frames sent to clients",
        ),
        registry,
    }
});

/// Decrements a per-room gauge and drops the label at zero, like the TypeScript GaugeManager.
pub fn dec_room_gauge(gauge: &IntGaugeVec, room: &str) {
    let g = gauge.with_label_values(&[room]);
    g.dec();
    if g.get() <= 0 {
        let _ = gauge.remove_label_values(&[room]);
    }
}

pub fn render() -> (String, String) {
    let encoder = TextEncoder::new();
    let mut buf = Vec::new();
    encoder.encode(&METRICS.registry.gather(), &mut buf).expect("text encoding cannot fail");
    (encoder.format_type().to_owned(), String::from_utf8(buf).expect("prometheus text is utf-8"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_the_dashboard_metric_names() {
        METRICS.nb_clients_per_room.with_label_values(&["r"]).inc();
        let (_, text) = render();
        for name in [
            "workadventure_nb_sockets",
            "workadventure_nb_clients_per_room",
            "workadventure_nb_spaces",
            "workadventure_nb_rooms",
        ] {
            assert!(text.contains(name), "{name} missing");
        }
        dec_room_gauge(&METRICS.nb_clients_per_room, "r");
        assert!(!render().1.contains("room=\"r\""), "label removed at zero");
    }
}
