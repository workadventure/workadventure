//! wa-load: R rooms of U headless players walking like the front does (a move every 200 ms, a stop every
//! 10 moves), everybody seeing everybody in their room. Measures:
//! - throughput: moves sent and SubMessages received per second;
//! - latency of a move, from the mover's send to its arrival at each watcher (includes the server's 100 ms
//!   batching window, like in production);
//! - server CPU, from `process_cpu_seconds_total` on /metrics when available (Linux).
//!
//! Each player walks along x, one pixel per move, on its own row: the x of a received position tells which
//! move it was, so the send time is looked up in a per-player ring, without any lock.
//!
//! Usage: wa-load --server http://host:3000 [--rooms 10] [--users 50] [--duration 60] [--move-ms 200]
//!                [--metrics-token TOKEN]

use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use prost::encoding::decode_varint;
use tokio::sync::Semaphore;
use tokio_tungstenite::tungstenite::Message;
use wa_bot::{Bot, Options};

const LANE: i32 = 800;
const ORIGIN: i32 = 100;
const MAX_SAMPLES_PER_BOT: usize = 20_000;

struct Args {
    server: String,
    rooms: usize,
    users: usize,
    duration: Duration,
    move_every: Duration,
    metrics_token: Option<String>,
}

fn args() -> Args {
    let mut a = Args {
        server: "http://127.0.0.1:3000".into(),
        rooms: 10,
        users: 50,
        duration: Duration::from_secs(60),
        move_every: Duration::from_millis(200),
        metrics_token: None,
    };
    let mut it = std::env::args().skip(1);
    while let Some(k) = it.next() {
        let v = it.next().unwrap_or_default();
        match k.as_str() {
            "--server" => a.server = v,
            "--rooms" => a.rooms = v.parse().expect("--rooms"),
            "--users" => a.users = v.parse().expect("--users"),
            "--duration" => a.duration = Duration::from_secs(v.parse().expect("--duration")),
            "--move-ms" => a.move_every = Duration::from_millis(v.parse().expect("--move-ms")),
            "--metrics-token" => a.metrics_token = Some(v),
            _ => panic!("unknown argument {k}"),
        }
    }
    a
}

/// When each x of a player's lane was last sent, in µs since the start.
struct Ring(Vec<AtomicU64>);

struct Room {
    /// Indexed by user id (small integers, per room).
    rings: Vec<Arc<Ring>>,
}

struct Stats {
    moves_sent: AtomicU64,
    subs_received: AtomicU64,
    moves_received: AtomicU64,
}

/// Walks the protobuf fields of `buf` without allocating: `f(field, bytes, 0)` for a length-delimited field,
/// `f(field, &[], value)` for a varint.
fn fields(mut buf: &[u8], mut f: impl FnMut(u32, &[u8], u64)) -> Option<()> {
    while !buf.is_empty() {
        let key = decode_varint(&mut buf).ok()?;
        let (field, wire) = ((key >> 3) as u32, key & 7);
        match wire {
            0 => {
                let v = decode_varint(&mut buf).ok()?;
                f(field, &[], v);
            }
            2 => {
                let len = decode_varint(&mut buf).ok()? as usize;
                let (body, rest) = (buf.get(..len)?, buf.get(len..)?);
                f(field, body, 0);
                buf = rest;
            }
            5 => buf = buf.get(4..)?,
            1 => buf = buf.get(8..)?,
            _ => return None,
        }
    }
    Some(())
}

/// Calls `f(kind, body)` for each SubMessage of a batch frame (kind 1 = userMovedMessage).
fn for_each_sub(frame: &[u8], mut f: impl FnMut(u32, &[u8])) {
    // PusherToFrontWebSocketMessage.message (2) -> ServerToClientMessage.batchMessage (1) -> payload (2).
    let _ = fields(frame, |field, envelope, _| {
        if field != 2 {
            return;
        }
        let _ = fields(envelope, |field, batch, _| {
            if field != 1 {
                return;
            }
            let _ = fields(batch, |field, sub, _| {
                if field != 2 {
                    return;
                }
                let _ = fields(sub, |kind, body, _| f(kind, body));
            });
        });
    });
}

/// (userId, position.x) of a UserMovedMessage.
fn user_moved(body: &[u8]) -> Option<(i32, i32)> {
    let (mut user, mut x) = (0i32, 0i32);
    fields(body, |field, bytes, v| match field {
        1 => user = v as i32,
        2 => {
            let _ = fields(bytes, |f, _, v| {
                if f == 1 {
                    x = v as i32;
                }
            });
        }
        _ => {}
    })?;
    Some((user, x))
}

/// This process's CPU time (Linux), to show whether the load generator itself was the bottleneck.
fn own_cpu_seconds() -> Option<f64> {
    let stat = std::fs::read_to_string("/proc/self/stat").ok()?;
    let fields: Vec<&str> = stat.rsplit_once(')')?.1.split_whitespace().collect();
    let ticks: f64 = fields.get(11)?.parse::<f64>().ok()? + fields.get(12)?.parse::<f64>().ok()?;
    Some(ticks / 100.0)
}

/// `metric value` from the server's /metrics.
async fn server_metrics(server: &str, token: Option<&str>) -> Option<String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let host = server.trim_start_matches("http://").trim_end_matches('/');
    let mut s = tokio::net::TcpStream::connect(host).await.ok()?;
    let auth = token.map(|t| format!("Authorization: Bearer {t}\r\n")).unwrap_or_default();
    s.write_all(format!("GET /metrics HTTP/1.1\r\nHost: {host}\r\n{auth}Connection: close\r\n\r\n").as_bytes())
        .await
        .ok()?;
    let mut body = String::new();
    s.read_to_string(&mut body).await.ok()?;
    Some(body)
}

fn metric(body: &Option<String>, name: &str) -> Option<f64> {
    body.as_ref()?
        .lines()
        .find(|l| l.starts_with(name) && l[name.len()..].starts_with(' '))
        .and_then(|l| l.split_whitespace().nth(1)?.parse().ok())
}

#[tokio::main]
async fn main() {
    let a = args();
    let start = Instant::now();
    let stats = Arc::new(Stats {
        moves_sent: AtomicU64::new(0),
        subs_received: AtomicU64::new(0),
        moves_received: AtomicU64::new(0),
    });
    // Connect everybody first, a few at a time.
    let connecting = Arc::new(Semaphore::new(64));
    let mut joins = Vec::new();
    for r in 0..a.rooms {
        for u in 0..a.users {
            let (server, connecting) = (a.server.clone(), connecting.clone());
            joins.push(tokio::spawn(async move {
                let _permit = connecting.acquire().await.expect("semaphore");
                let room = format!("http://play.load/_/global/maps.load/room{r}.json");
                let y = ORIGIN + (u as i32 * 16) % LANE;
                let (bot, stream) = Bot::connect(Options {
                    server,
                    room_url: room,
                    name: format!("b{r}-{u}"),
                    x: ORIGIN,
                    y,
                    viewport: (0, 0, 1000, 1000),
                    availability: 1,
                    token: None,
                })
                .await
                .unwrap_or_else(|e| panic!("bot {r}/{u}: {}", e.0));
                (r, u, y, bot, stream)
            }));
        }
    }
    let mut bots = Vec::new();
    for j in joins {
        bots.push(j.await.expect("connect task"));
    }
    let connected_after = start.elapsed();
    let max_id = bots.iter().map(|b| b.3.user_id).max().unwrap_or(0) as usize;
    let rooms: Vec<Arc<Room>> = (0..a.rooms)
        .map(|_| {
            Arc::new(Room {
                rings: (0..=max_id).map(|_| Arc::new(Ring((0..LANE).map(|_| AtomicU64::new(0)).collect()))).collect(),
            })
        })
        .collect();
    eprintln!("{} bots connected in {:.1}s", bots.len(), connected_after.as_secs_f64());

    let before = server_metrics(&a.server, a.metrics_token.as_deref()).await;
    let own_before = own_cpu_seconds();
    let t0 = Instant::now();
    let end = t0 + a.duration;
    let mut tasks = Vec::new();
    for (r, u, y, mut bot, mut stream) in bots {
        let room = rooms[r].clone();
        let ring = room.rings[bot.user_id as usize].clone();
        let stats_w = stats.clone();
        let move_every = a.move_every;
        // Writer: walk.
        tasks.push(tokio::spawn(async move {
            let offset = (u as i32 * 97) % LANE;
            // Players do not move in step: spread the bots over the period.
            let phase = Duration::from_micros(
                ((r * 104_729 + u * 7_919) as u64 * 1_000) % move_every.as_micros().max(1) as u64,
            );
            let mut tick = tokio::time::interval_at(tokio::time::Instant::now() + phase, move_every);
            let mut seq: i32 = 0;
            while Instant::now() < end {
                tick.tick().await;
                seq += 1;
                let lane_x = (offset + seq) % LANE;
                ring.0[lane_x as usize].store(t0.elapsed().as_micros() as u64, Ordering::Relaxed);
                if bot.move_to(ORIGIN + lane_x, y, seq % 10 != 0, (0, 0, 1000, 1000)).await.is_err() {
                    break;
                }
                stats_w.moves_sent.fetch_add(1, Ordering::Relaxed);
            }
            bot.close().await;
            Vec::new()
        }));
        // Reader: latency of the moves of the others.
        let stats_r = stats.clone();
        tasks.push(tokio::spawn(async move {
            let mut samples: Vec<u32> = Vec::with_capacity(4096);
            let mut seen: u64 = 0;
            while let Ok(Some(Ok(frame))) = tokio::time::timeout_at(end.into(), stream.next()).await {
                let Message::Binary(bytes) = frame else { continue };
                let now = t0.elapsed().as_micros() as u64;
                let mut subs = 0u64;
                let mut moves = 0u64;
                for_each_sub(&bytes, |kind, body| {
                    subs += 1;
                    if kind != 1 {
                        return;
                    }
                    moves += 1;
                    let Some((user_id, x)) = user_moved(body) else { return };
                    let Some(ring) = room.rings.get(user_id as usize) else { return };
                    let Some(sent) = usize::try_from(x - ORIGIN).ok().and_then(|i| ring.0.get(i)) else { return };
                    let sent = sent.load(Ordering::Relaxed);
                    if sent == 0 || sent > now {
                        return;
                    }
                    seen += 1;
                    // Keep a bounded, evenly spread sample.
                    if samples.len() < MAX_SAMPLES_PER_BOT {
                        samples.push((now - sent) as u32);
                    } else {
                        let i = (seen as usize * 7919) % MAX_SAMPLES_PER_BOT;
                        samples[i] = (now - sent) as u32;
                    }
                });
                stats_r.subs_received.fetch_add(subs, Ordering::Relaxed);
                stats_r.moves_received.fetch_add(moves, Ordering::Relaxed);
            }
            samples
        }));
    }
    let mut all: Vec<u32> = Vec::new();
    for t in tasks {
        all.extend(t.await.unwrap_or_default());
    }
    let elapsed = t0.elapsed().as_secs_f64();
    let after = server_metrics(&a.server, a.metrics_token.as_deref()).await;
    let own_after = own_cpu_seconds();
    all.sort_unstable();
    let pct = |p: f64| {
        all.get(((all.len() as f64 * p) as usize).min(all.len().saturating_sub(1)))
            .map_or(0.0, |v| f64::from(*v) / 1000.0)
    };
    let rate = |b: Option<f64>, a: Option<f64>| match (b, a) {
        (Some(b), Some(a)) => format!("{:.2}", (a - b) / elapsed),
        _ => "null".into(),
    };
    let cpu = rate(metric(&before, "process_cpu_seconds_total"), metric(&after, "process_cpu_seconds_total"));
    let load_cpu = rate(own_before, own_after);
    let slow = match (
        metric(&before, "workadventure_server_slow_consumers_total"),
        metric(&after, "workadventure_server_slow_consumers_total"),
    ) {
        (Some(b), Some(a)) => format!("{}", a - b),
        _ => "null".into(),
    };
    println!(
        "{{\"rooms\":{},\"users_per_room\":{},\"seconds\":{:.1},\"moves_sent_per_s\":{:.0},\"subs_received_per_s\":{:.0},\"moves_received_per_s\":{:.0},\"latency_ms\":{{\"p50\":{:.1},\"p90\":{:.1},\"p99\":{:.1},\"max\":{:.1}}},\"samples\":{},\"server_cpu_cores\":{},\"slow_consumers_closed\":{},\"load_generator_cpu_cores\":{}}}",
        a.rooms,
        a.users,
        elapsed,
        stats.moves_sent.load(Ordering::Relaxed) as f64 / elapsed,
        stats.subs_received.load(Ordering::Relaxed) as f64 / elapsed,
        stats.moves_received.load(Ordering::Relaxed) as f64 / elapsed,
        pct(0.50),
        pct(0.90),
        pct(0.99),
        pct(1.0),
        all.len(),
        cpu,
        slow,
        load_cpu
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use prost::Message as _;
    use wa_proto::messages as pb;

    #[test]
    fn the_light_parser_reads_moves_like_prost() {
        let moved = |id, x| pb::SubMessage {
            message: Some(pb::sub_message::Message::UserMovedMessage(pb::UserMovedMessage {
                user_id: id,
                position: Some(wa_bot::position(x, 7, true)),
            })),
        };
        let left = pb::SubMessage {
            message: Some(pb::sub_message::Message::UserLeftMessage(pb::UserLeftMessage { user_id: 3 })),
        };
        let frame = pb::PusherToFrontWebSocketMessage {
            nonce: 9,
            message: Some(pb::ServerToClientMessage {
                message: Some(pb::server_to_client_message::Message::BatchMessage(pb::BatchMessage {
                    event: String::new(),
                    payload: vec![moved(5, 123), left, moved(6, 900)],
                })),
            }),
        }
        .encode_to_vec();
        let mut seen = Vec::new();
        for_each_sub(&frame, |kind, body| seen.push((kind, user_moved(body).filter(|_| kind == 1))));
        assert_eq!(seen, vec![(1, Some((5, 123))), (5, None), (1, Some((6, 900)))]);
    }
}
