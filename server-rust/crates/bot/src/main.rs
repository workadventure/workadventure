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
use prost::Message as _;
use tokio::sync::Semaphore;
use tokio_tungstenite::tungstenite::Message;
use wa_bot::{Bot, Options, Sub, Top};
use wa_proto::messages as pb;

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

async fn server_cpu_seconds(server: &str, token: Option<&str>) -> Option<f64> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let host = server.trim_start_matches("http://").trim_end_matches('/');
    let mut s = tokio::net::TcpStream::connect(host).await.ok()?;
    let auth = token.map(|t| format!("Authorization: Bearer {t}\r\n")).unwrap_or_default();
    s.write_all(format!("GET /metrics HTTP/1.1\r\nHost: {host}\r\n{auth}Connection: close\r\n\r\n").as_bytes())
        .await
        .ok()?;
    let mut body = String::new();
    s.read_to_string(&mut body).await.ok()?;
    body.lines()
        .find(|l| l.starts_with("process_cpu_seconds_total "))
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
                rings: (0..=max_id)
                    .map(|_| Arc::new(Ring((0..LANE).map(|_| AtomicU64::new(0)).collect())))
                    .collect(),
            })
        })
        .collect();
    eprintln!("{} bots connected in {:.1}s", bots.len(), connected_after.as_secs_f64());

    let cpu_before = server_cpu_seconds(&a.server, a.metrics_token.as_deref()).await;
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
            let mut tick = tokio::time::interval(move_every);
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
                let Ok(env) = pb::PusherToFrontWebSocketMessage::decode(bytes) else { continue };
                let Some(Top::BatchMessage(batch)) = env.message.and_then(|m| m.message) else { continue };
                let now = t0.elapsed().as_micros() as u64;
                stats_r.subs_received.fetch_add(batch.payload.len() as u64, Ordering::Relaxed);
                for sub in batch.payload {
                    let Some(Sub::UserMovedMessage(m)) = sub.message else { continue };
                    let Some(p) = m.position else { continue };
                    stats_r.moves_received.fetch_add(1, Ordering::Relaxed);
                    let lane_x = p.x - ORIGIN;
                    let Some(ring) = room.rings.get(m.user_id as usize) else { continue };
                    let Some(sent) = usize::try_from(lane_x).ok().and_then(|i| ring.0.get(i)) else { continue };
                    let sent = sent.load(Ordering::Relaxed);
                    if sent == 0 || sent > now {
                        continue;
                    }
                    seen += 1;
                    // Keep a bounded, evenly spread sample.
                    if samples.len() < MAX_SAMPLES_PER_BOT {
                        samples.push((now - sent) as u32);
                    } else {
                        let i = (seen as usize * 7919) % MAX_SAMPLES_PER_BOT;
                        samples[i] = (now - sent) as u32;
                    }
                }
            }
            samples
        }));
    }
    let mut all: Vec<u32> = Vec::new();
    for t in tasks {
        all.extend(t.await.unwrap_or_default());
    }
    let elapsed = t0.elapsed().as_secs_f64();
    let cpu_after = server_cpu_seconds(&a.server, a.metrics_token.as_deref()).await;
    all.sort_unstable();
    let pct = |p: f64| all.get(((all.len() as f64 * p) as usize).min(all.len().saturating_sub(1))).map_or(0.0, |v| f64::from(*v) / 1000.0);
    let cpu = match (cpu_before, cpu_after) {
        (Some(b), Some(a)) => format!("{:.2}", (a - b) / elapsed),
        _ => "null".into(),
    };
    println!(
        "{{\"rooms\":{},\"users_per_room\":{},\"seconds\":{:.1},\"moves_sent_per_s\":{:.0},\"subs_received_per_s\":{:.0},\"moves_received_per_s\":{:.0},\"latency_ms\":{{\"p50\":{:.1},\"p90\":{:.1},\"p99\":{:.1},\"max\":{:.1}}},\"samples\":{},\"server_cpu_cores\":{}}}",
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
        cpu
    );
}
