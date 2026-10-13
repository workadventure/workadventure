//! A logical client connection (what PusherWebSocket was), which can outlive its WebSocket transport for
//! CLIENT_DISCONNECTION_RETENTION_MS and be resumed by a new transport (`connectionId` + `lastReceivedNonce`).
//!
//! Tasks of a session:
//! - one **writer** per session: drains the outbox, groups SubMessages into 100 ms batches, numbers frames
//!   (nonces), keeps them in the bounded resume store and writes them to the current transport;
//! - one **logic** task per session (`logic.rs`): handles client messages one at a time, in order;
//! - one **reader** per transport: decodes envelopes, drops replayed nonces, feeds the logic task.

use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::{Arc, OnceLock};
use std::time::Duration;

use axum::extract::ws::{CloseFrame, Message, WebSocket};
use bytes::Bytes;
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{SinkExt, StreamExt};
use prost::Message as _;
use tokio::sync::{mpsc, oneshot, watch};
use tokio::time::{Instant, sleep_until, timeout};
use wa_core::room::UserId;
use wa_core::user::Texture;
use wa_proto::messages as pb;

use crate::metrics::METRICS;
use crate::outbox::{CloseReason, Frame, Limits, Outbox};
use crate::resume::{ResumeLimits, ResumeStore};
use crate::wire;

/// Close code after which the front opens a fresh connection (WS_CLOSE_CODE_SESSION_DESTROYED).
pub const CLOSE_SESSION_DESTROYED: u16 = 4000;
const BATCH_WINDOW: Duration = Duration::from_millis(100);
const WS_PING_EVERY: Duration = Duration::from_secs(25);
/// The front reloads the scene when it gets no batched ping for 100 s.
const APP_PING_EVERY: Duration = Duration::from_secs(80);
const SEND_TIMEOUT: Duration = Duration::from_secs(10);
const INBOX_CAPACITY: usize = 256;

pub type WsSink = SplitSink<WebSocket, Message>;
pub type WsStream = SplitStream<WebSocket>;

/// Who the client is, fixed at upgrade.
#[derive(Debug, Clone, Default)]
pub struct SessionInfo {
    pub room_id: String,
    pub world: String,
    /// The raw Sec-WebSocket-Protocol value (the JWT): a resume must present the same one.
    pub token: String,
    pub user_uuid: String,
    pub is_logged: bool,
    pub ip_address: String,
    pub tags: Vec<String>,
    pub textures: Vec<Texture>,
    pub companion: Option<Texture>,
    pub visit_card_url: Option<String>,
    pub can_edit: bool,
    pub chat_id: Option<String>,
    pub room_name: Option<String>,
    pub tab_id: String,
    pub connection_id: Option<String>,
}

enum WriterCmd {
    Attach {
        sink: WsSink,
        last_received: u32,
        reply: oneshot::Sender<bool>,
    },
    Detach {
        generation: u64,
    },
}

pub struct Session {
    pub info: SessionInfo,
    pub outbox: Outbox,
    user_id: OnceLock<UserId>,
    last_client_nonce: AtomicU32,
    generation: AtomicU64,
    writer: mpsc::Sender<WriterCmd>,
    inbox: mpsc::Sender<pb::ClientToServerMessage>,
    ended: watch::Sender<bool>,
    retention: Duration,
}

pub struct SessionParts {
    pub session: Arc<Session>,
    pub inbox: mpsc::Receiver<pb::ClientToServerMessage>,
    pub ended: watch::Receiver<bool>,
}

impl Session {
    /// Creates a session on its first transport and starts its writer and reader. The caller starts the
    /// logic task with the returned parts.
    pub fn start(info: SessionInfo, socket: WebSocket, retention: Duration) -> SessionParts {
        let (sink, stream) = socket.split();
        let (writer_tx, writer_rx) = mpsc::channel(4);
        let (inbox_tx, inbox_rx) = mpsc::channel(INBOX_CAPACITY);
        let (ended_tx, ended_rx) = watch::channel(false);
        let session = Arc::new(Session {
            info,
            outbox: Outbox::new(Limits::default()),
            user_id: OnceLock::new(),
            last_client_nonce: AtomicU32::new(0),
            generation: AtomicU64::new(0),
            writer: writer_tx,
            inbox: inbox_tx,
            ended: ended_tx,
            retention,
        });
        METRICS.nb_sockets.inc();
        tokio::spawn(writer(session.clone(), sink, writer_rx));
        tokio::spawn(reader(session.clone(), stream, 0));
        SessionParts {
            session,
            inbox: inbox_rx,
            ended: ended_rx,
        }
    }

    pub fn user_id(&self) -> Option<UserId> {
        self.user_id.get().copied()
    }

    /// Set once, by the room, when the user joined.
    pub fn set_user_id(&self, id: UserId) {
        let _ = self.user_id.set(id);
    }

    /// `${roomId}_${userId}`: the front computes the same string.
    pub fn space_user_id(&self) -> Option<String> {
        self.user_id().map(|id| format!("{}_{}", self.info.room_id, id))
    }

    /// Never blocks. A refused push means the session is closing: there is nobody left to tell.
    pub fn push(&self, frame: Frame) {
        let _ = self.outbox.push(frame);
    }

    pub fn push_move(&self, mover: i32, bytes: Bytes) {
        let _ = self.outbox.push_move(mover, bytes);
    }

    /// Ends the session from the server side: the client is told to start over.
    pub fn end(&self) {
        self.outbox.close(CloseReason::Ended);
    }

    pub fn is_ended(&self) -> bool {
        *self.ended.borrow()
    }

    /// A new transport for this session (`lastReceivedNonce`). False when it cannot be resumed: the
    /// transport is then closed with 1008 and the front opens a fresh connection.
    pub async fn resume(self: &Arc<Self>, socket: WebSocket, last_received: u32) -> bool {
        let (sink, stream) = socket.split();
        let (reply, answer) = oneshot::channel();
        let generation = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
        if self
            .writer
            .send(WriterCmd::Attach {
                sink,
                last_received,
                reply,
            })
            .await
            .is_err()
        {
            return false;
        }
        if answer.await != Ok(true) {
            return false;
        }
        tokio::spawn(reader(self.clone(), stream, generation));
        true
    }

    fn transport_closed(self: &Arc<Self>, generation: u64, code: Option<u16>) {
        if self.generation.load(Ordering::SeqCst) != generation {
            return; // An old transport, already replaced.
        }
        let final_close = matches!(code, Some(1000 | 1001 | CLOSE_SESSION_DESTROYED));
        if final_close || self.info.connection_id.is_none() || self.retention.is_zero() {
            self.end();
            return;
        }
        let _ = self.writer.try_send(WriterCmd::Detach { generation });
        let session = self.clone();
        tokio::spawn(async move {
            tokio::time::sleep(session.retention).await;
            if session.generation.load(Ordering::SeqCst) == generation {
                session.end();
            }
        });
    }
}

async fn send_frame(sink: &mut Option<WsSink>, frame: Bytes) {
    let Some(s) = sink else { return };
    match timeout(SEND_TIMEOUT, s.send(Message::Binary(frame))).await {
        Ok(Ok(())) => METRICS.ws_frames_sent.inc(),
        // The transport is gone or stuck: the reader (or the retention timer) decides what happens next.
        _ => *sink = None,
    }
}

async fn writer(session: Arc<Session>, first: WsSink, mut commands: mpsc::Receiver<WriterCmd>) {
    let mut sink = Some(first);
    let mut nonce: u32 = 0;
    let mut store = ResumeStore::new(ResumeLimits {
        retention: session.retention,
        max_frames: 2000,
        max_bytes: 4 * 1024 * 1024,
    });
    let mut ws_ping = tokio::time::interval_at(Instant::now() + WS_PING_EVERY, WS_PING_EVERY);
    let mut app_ping = tokio::time::interval_at(Instant::now() + APP_PING_EVERY, APP_PING_EVERY);
    let mut subs: Vec<Bytes> = Vec::new();

    let closed = loop {
        tokio::select! {
            biased;
            Some(cmd) = commands.recv() => {
                match cmd {
                    WriterCmd::Attach { sink: new, last_received, reply } => {
                        if !store.can_resume_after(last_received, std::time::Instant::now()) {
                            let mut new = new;
                            let _ = new.send(close(1008, "Cannot replace socket: server is missing messages to replay")).await;
                            let _ = reply.send(false);
                            continue;
                        }
                        if let Some(mut old) = sink.replace(new) {
                            let _ = old.send(close(1008, "Replaced by a reconnected socket")).await;
                        }
                        let _ = reply.send(true);
                        let missed: Vec<Bytes> = store.after(last_received).cloned().collect();
                        for frame in missed {
                            send_frame(&mut sink, frame).await;
                        }
                    }
                    WriterCmd::Detach { generation } => {
                        if session.generation.load(Ordering::SeqCst) == generation {
                            sink = None;
                        }
                    }
                }
                continue;
            }
            _ = ws_ping.tick() => {
                if let Some(s) = &mut sink && s.send(Message::Ping(Bytes::new())).await.is_err() {
                    sink = None;
                }
                continue;
            }
            _ = app_ping.tick() => {
                subs.push(wire::ping_entry());
            }
            _ = session.outbox.wait() => {
                // Batch window: wait for more SubMessages unless something must go out now.
                if !session.outbox.has_direct() && !session.outbox.is_closed() {
                    let deadline = Instant::now() + BATCH_WINDOW;
                    loop {
                        tokio::select! {
                            _ = sleep_until(deadline) => break,
                            _ = session.outbox.wait() => {
                                if session.outbox.has_direct() || session.outbox.is_closed() { break; }
                            }
                        }
                    }
                }
            }
        }

        let drained = session.outbox.drain();
        for frame in drained.frames {
            match frame {
                Frame::Sub(entry) => subs.push(entry),
                Frame::Direct(body) => {
                    if !subs.is_empty() {
                        let batch = wire::batch_body(&std::mem::take(&mut subs));
                        nonce += 1;
                        let env = wire::envelope(nonce, &batch);
                        store.add(nonce, env.clone(), std::time::Instant::now());
                        send_frame(&mut sink, env).await;
                    }
                    nonce += 1;
                    let env = wire::envelope(nonce, &body);
                    store.add(nonce, env.clone(), std::time::Instant::now());
                    send_frame(&mut sink, env).await;
                }
            }
        }
        if !subs.is_empty() {
            let batch = wire::batch_body(&std::mem::take(&mut subs));
            nonce += 1;
            let env = wire::envelope(nonce, &batch);
            store.add(nonce, env.clone(), std::time::Instant::now());
            send_frame(&mut sink, env).await;
        }
        if let Some(reason) = drained.closed {
            break reason;
        }
    };

    if closed == CloseReason::SlowConsumer {
        METRICS.slow_consumers.inc();
        tracing::warn!(user = %session.info.user_uuid, "closing a slow consumer");
    }
    if let Some(mut s) = sink {
        let _ = timeout(SEND_TIMEOUT, s.send(close(CLOSE_SESSION_DESTROYED, "Session ended"))).await;
    }
    METRICS.nb_sockets.dec();
    let _ = session.ended.send(true);
}

fn close(code: u16, reason: &'static str) -> Message {
    Message::Close(Some(CloseFrame {
        code,
        reason: reason.into(),
    }))
}

async fn reader(session: Arc<Session>, mut stream: WsStream, generation: u64) {
    let idle = session_idle_timer();
    let code = loop {
        let next = match timeout(idle, stream.next()).await {
            Err(_) => break None, // idle: like uWS idleTimeout
            Ok(None) | Ok(Some(Err(_))) => break None,
            Ok(Some(Ok(m))) => m,
        };
        match next {
            Message::Binary(bytes) => {
                METRICS.ws_messages_received.inc();
                // An undecodable frame is a broken client: start over.
                let Ok(frame) = pb::FrontToPusherWebSocketMessage::decode(bytes) else {
                    session.end();
                    return;
                };
                let Some(message) = frame.message else {
                    session.end();
                    return;
                };
                // A resumed transport re-sends its last frames: drop what was already handled.
                if session.last_client_nonce.fetch_max(frame.nonce, Ordering::SeqCst) >= frame.nonce {
                    continue;
                }
                if session.inbox.send(message).await.is_err() {
                    return; // The session is over.
                }
            }
            Message::Close(frame) => break Some(frame.map_or(1005, |f| f.code)),
            Message::Text(_) | Message::Ping(_) | Message::Pong(_) => {}
        }
    };
    session.transport_closed(generation, code);
}

static IDLE_TIMER: OnceLock<Duration> = OnceLock::new();

/// SOCKET_IDLE_TIMER, set once at startup.
pub fn set_idle_timer(d: Duration) {
    let _ = IDLE_TIMER.set(d);
}

fn session_idle_timer() -> Duration {
    *IDLE_TIMER.get().unwrap_or(&Duration::from_secs(120))
}

/// Upgrades that are refused still get a WebSocket: one message, then a normal close (the front reads the
/// reason from the message).
pub async fn reject(socket: WebSocket, message: pb::server_to_client_message::Message) {
    let mut socket = socket;
    let body = pb::ServerToClientMessage { message: Some(message) }.encode_to_vec();
    let _ = socket.send(Message::Binary(wire::envelope(1, &body))).await;
    let _ = socket.send(close(1000, "Error message sent")).await;
}

/// Closes a socket right away (a resume that cannot be honoured).
pub async fn refuse(socket: WebSocket, code: u16, reason: &'static str) {
    let mut socket = socket;
    let _ = socket.send(close(code, reason)).await;
}
