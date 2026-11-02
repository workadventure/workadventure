//! A headless WorkAdventure client: enough of the front's protocol to enter a room, move and join spaces.
//! Used by the integration tests and by the load generator. It speaks the frozen protocol only, so it can be
//! pointed at any server (TypeScript, Go or Rust).

use std::time::{Duration, Instant};

use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{SinkExt, StreamExt};
use prost::Message as _;
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::{self, Message};
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};
use wa_proto::messages as pb;

pub use pb::server_to_client_message::Message as Top;
pub use pb::sub_message::Message as Sub;

type Ws = WebSocketStream<MaybeTlsStream<TcpStream>>;

/// One thing the server said, with when it arrived.
#[derive(Debug, Clone)]
#[allow(clippy::large_enum_variant)] // A test client: boxing would only make the matches heavier.
pub enum Incoming {
    Top(Top),
    Sub(Sub),
}

pub struct Bot {
    pub user_id: i32,
    pub room_url: String,
    /// What the server said when the bot entered the room.
    pub joined: pb::RoomJoinedMessage,
    sink: SplitSink<Ws, Message>,
    nonce: u32,
    next_query: i32,
}

#[derive(Debug)]
pub struct BotError(pub String);

impl<E: std::fmt::Display> From<E> for BotError {
    fn from(e: E) -> Self {
        BotError(e.to_string())
    }
}

pub struct Options {
    /// e.g. "http://127.0.0.1:3000"
    pub server: String,
    pub room_url: String,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub viewport: (i32, i32, i32, i32),
    pub availability: i32,
    /// A token to present instead of an anonymous one (tests sign their own, with tags).
    pub token: Option<String>,
}

/// `POST /anonymLogin`, without an HTTP client crate: one request on a raw socket.
async fn anonymous_token(server: &str) -> Result<String, BotError> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let host = server.trim_start_matches("http://").trim_end_matches('/');
    let mut s = TcpStream::connect(host).await?;
    s.write_all(
        format!("POST /anonymLogin HTTP/1.1\r\nHost: {host}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
            .as_bytes(),
    )
    .await?;
    let mut response = String::new();
    s.read_to_string(&mut response).await?;
    let body = response.split("\r\n\r\n").nth(1).ok_or_else(|| BotError("no body".into()))?;
    // Chunked or not, the JSON object is in there.
    let start = body.find('{').ok_or_else(|| BotError(format!("bad login answer: {response}")))?;
    let end = body.rfind('}').ok_or_else(|| BotError("bad login answer".into()))?;
    let v: serde_json::Value = serde_json::from_str(&body[start..=end])?;
    Ok(v["authToken"].as_str().ok_or_else(|| BotError("no authToken".into()))?.to_owned())
}

fn decode(bytes: &[u8]) -> Vec<Incoming> {
    let Ok(env) = pb::PusherToFrontWebSocketMessage::decode(bytes) else { return vec![] };
    match env.message.and_then(|m| m.message) {
        Some(Top::BatchMessage(b)) => b.payload.into_iter().filter_map(|s| s.message).map(Incoming::Sub).collect(),
        Some(top) => vec![Incoming::Top(top)],
        None => vec![],
    }
}

/// Reads until `pred` matches, or fails after `within`.
async fn read_until(
    stream: &mut SplitStream<Ws>,
    within: Duration,
    mut pred: impl FnMut(&Incoming) -> bool,
) -> Result<Incoming, BotError> {
    let deadline = Instant::now() + within;
    loop {
        let left = deadline.saturating_duration_since(Instant::now());
        match tokio::time::timeout(left, stream.next()).await {
            Err(_) => return Err(BotError("timeout".into())),
            Ok(None) => return Err(BotError("closed".into())),
            Ok(Some(Err(e))) => return Err(e.into()),
            Ok(Some(Ok(Message::Binary(b)))) => {
                for m in decode(&b) {
                    if pred(&m) {
                        return Ok(m);
                    }
                }
            }
            Ok(Some(Ok(Message::Close(f)))) => return Err(BotError(format!("closed: {f:?}"))),
            Ok(Some(Ok(_))) => {}
        }
    }
}

impl Bot {
    /// Logs in anonymously, opens the WebSocket and enters the room. Returns the bot and the stream of what
    /// the server sends next.
    pub async fn connect(o: Options) -> Result<(Bot, SplitStream<Ws>), BotError> {
        let token = match &o.token {
            Some(t) => t.clone(),
            None => anonymous_token(&o.server).await?,
        };
        let query = {
            let mut q = form_urlencoded::Serializer::new(String::new());
            q.append_pair("roomId", &o.room_url)
                .append_pair("characterTextureIds", "male1")
                .append_pair("version", "dev")
                .append_pair("chatID", "")
                .append_pair("roomName", "")
                .append_pair("cameraState", "false")
                .append_pair("microphoneState", "false")
                .append_pair("tabId", &uuid())
                .append_pair("connectionId", &uuid());
            q.finish()
        };
        let url = format!("{}/ws/room?{query}", o.server.replacen("http", "ws", 1));
        let mut request = url.into_client_request()?;
        request.headers_mut().insert("Sec-WebSocket-Protocol", HeaderValue::from_str(&token)?);
        let (ws, _) = tokio_tungstenite::connect_async(request).await?;
        let (sink, mut stream) = ws.split();
        read_until(&mut stream, Duration::from_secs(10), |m| matches!(m, Incoming::Top(Top::RoomConnectedMessage(_))))
            .await?;
        let mut bot = Bot {
            user_id: 0,
            room_url: o.room_url,
            joined: pb::RoomJoinedMessage::default(),
            sink,
            nonce: 0,
            next_query: 0,
        };
        let (left, top, right, bottom) = o.viewport;
        bot.send(pb::client_to_server_message::Message::JoinRoomFrontMessage(pb::JoinRoomFrontMessage {
            position_message: Some(position(o.x, o.y, false)),
            viewport_message: Some(pb::ViewportMessage { left, top, right, bottom }),
            name: o.name,
            availability_status: o.availability,
        }))
        .await?;
        let joined =
            read_until(&mut stream, Duration::from_secs(10), |m| matches!(m, Incoming::Top(Top::RoomJoinedMessage(_))))
                .await?;
        if let Incoming::Top(Top::RoomJoinedMessage(j)) = joined {
            bot.user_id = j.current_user_id;
            bot.joined = j;
        }
        Ok((bot, stream))
    }

    pub fn space_user_id(&self) -> String {
        format!("{}_{}", self.room_url, self.user_id)
    }

    pub async fn send(&mut self, m: pb::client_to_server_message::Message) -> Result<(), BotError> {
        self.nonce += 1;
        let frame = pb::FrontToPusherWebSocketMessage {
            nonce: self.nonce,
            message: Some(pb::ClientToServerMessage { message: Some(m) }),
        };
        self.sink.send(Message::Binary(frame.encode_to_vec().into())).await?;
        Ok(())
    }

    pub async fn move_to(
        &mut self,
        x: i32,
        y: i32,
        moving: bool,
        viewport: (i32, i32, i32, i32),
    ) -> Result<(), BotError> {
        let (left, top, right, bottom) = viewport;
        self.send(pb::client_to_server_message::Message::UserMovesMessage(pb::UserMovesMessage {
            position: Some(position(x, y, moving)),
            viewport: Some(pb::ViewportMessage { left, top, right, bottom }),
        }))
        .await
    }

    pub async fn query(&mut self, q: pb::query_message::Query) -> Result<i32, BotError> {
        let id = self.next_query;
        self.next_query += 1;
        self.send(pb::client_to_server_message::Message::QueryMessage(pb::QueryMessage { id, query: Some(q) })).await?;
        Ok(id)
    }

    pub async fn join_space(&mut self, name: &str, props: &[&str]) -> Result<i32, BotError> {
        self.query(pb::query_message::Query::JoinSpaceQuery(pb::JoinSpaceQuery {
            space_name: name.into(),
            filter_type: 0,
            properties_to_sync: props.iter().map(|p| p.to_string()).collect(),
        }))
        .await
    }

    pub async fn watch_space(&mut self, name: &str) -> Result<(), BotError> {
        self.send(pb::client_to_server_message::Message::AddSpaceFilterMessage(pb::AddSpaceFilterMessage {
            space_filter_message: Some(pb::SpaceFilterMessage { space_name: name.into() }),
        }))
        .await
    }

    pub async fn close(mut self) {
        let _ = self
            .sink
            .send(Message::Close(Some(tungstenite::protocol::CloseFrame {
                code: tungstenite::protocol::frame::coding::CloseCode::Normal,
                reason: "bye".into(),
            })))
            .await;
    }
}

pub fn position(x: i32, y: i32, moving: bool) -> pb::PositionMessage {
    pb::PositionMessage { x, y, direction: pb::position_message::Direction::Down as i32, moving }
}

fn uuid() -> String {
    use std::hash::{BuildHasher, Hasher};
    let mut h = std::collections::hash_map::RandomState::new().build_hasher();
    h.write_u128(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos());
    format!("{:016x}", h.finish())
}

/// Collects what a bot receives, for tests: `expect` waits for a matching message.
pub struct Inbox {
    rx: mpsc::Receiver<Incoming>,
    seen: Vec<Incoming>,
}

impl Inbox {
    pub fn spawn(mut stream: SplitStream<Ws>) -> Inbox {
        let (tx, rx) = mpsc::channel(10_000);
        tokio::spawn(async move {
            while let Some(Ok(m)) = stream.next().await {
                if let Message::Binary(b) = m {
                    for i in decode(&b) {
                        if tx.send(i).await.is_err() {
                            return;
                        }
                    }
                }
            }
        });
        Inbox { rx, seen: Vec::new() }
    }

    /// The first message (already seen or still to come within `within`) matching `pred`.
    pub async fn expect<T>(
        &mut self,
        within: Duration,
        mut pred: impl FnMut(&Incoming) -> Option<T>,
    ) -> Result<T, BotError> {
        if let Some(t) = self.seen.iter().find_map(&mut pred) {
            return Ok(t);
        }
        let deadline = Instant::now() + within;
        loop {
            let left = deadline.saturating_duration_since(Instant::now());
            let Ok(Some(m)) = tokio::time::timeout(left, self.rx.recv()).await else {
                return Err(BotError(format!("nothing matched; seen: {:#?}", self.seen)));
            };
            let found = pred(&m);
            self.seen.push(m);
            if let Some(t) = found {
                return Ok(t);
            }
        }
    }

    pub fn clear(&mut self) {
        self.seen.clear();
    }

    /// Everything received and examined so far.
    pub fn seen(&self) -> &[Incoming] {
        &self.seen
    }
}
