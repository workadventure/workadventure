//! The Room API (gRPC, ROOM_API_PORT): variables and events of a room for trusted callers (RoomApiServer +
//! the back's handlers). Every call carries `X-API-Key`: without an admin it must be ROOM_API_SECRET_KEY and the
//! room must be under FRONT_URL; with ADMIN_API_URL, the admin authorizes the key for that room.
//!
//! Reading or writing a variable, or listening, brings the room up (getOrCreateRoom); an event to a room
//! nobody is in goes nowhere. A listening stream keeps its room alive.

use std::pin::Pin;
use std::time::Duration;

use tonic::codegen::tokio_stream::{self, Stream, StreamExt};
use tonic::{Request, Response, Status};
use wa_proto::room_api as api;
use wa_proto::room_api::room_api_server::{RoomApi, RoomApiServer};

use crate::AppState;
use crate::room_actor::{self, RoomApiCmd, RoomCmd};
use crate::wire;

pub fn enabled(state: &AppState) -> bool {
    ["ADMIN_API_URL", "ROOM_API_SECRET_KEY"].iter().any(|k| state.config.raw.get(*k).is_some_and(|v| !v.is_empty()))
}

pub fn service(state: AppState) -> RoomApiServer<Api> {
    RoomApiServer::new(Api { state })
}

pub struct Api {
    state: AppState,
}

impl Api {
    /// AuthenticationGuard.
    async fn authorize<T>(&self, request: &Request<T>, room: &str) -> Result<(), Status> {
        let Some(key) = request.metadata().get("x-api-key").and_then(|v| v.to_str().ok()).filter(|k| !k.is_empty())
        else {
            return Err(Status::unauthenticated("X-API-Key metadata not defined!"));
        };
        let config = &self.state.config;
        if let Some(admin) = config.raw.get("ADMIN_API_URL").filter(|v| !v.is_empty()) {
            return self.admin_authorize(admin, key, room).await;
        }
        if config.raw.get("ROOM_API_SECRET_KEY").map(String::as_str) != Some(key) {
            return Err(Status::unauthenticated("Wrong API key"));
        }
        if config.front_url != "/" && !room.starts_with(&config.front_url) {
            return Err(Status::permission_denied("You cannot interact with this room!"));
        }
        Ok(())
    }

    /// AdminAuthenticator: `GET /api/room-api/authorization?roomUrl=` with the key.
    async fn admin_authorize(&self, admin: &str, key: &str, room: &str) -> Result<(), Status> {
        let response = self
            .state
            .http
            .get(format!("{admin}/api/room-api/authorization"))
            .header("X-API-Key", key)
            .query(&[("roomUrl", room)])
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .map_err(|e| {
                tracing::error!(error = %e, "the admin did not answer the Room API authorization");
                Status::internal("Internal error, please contact us!")
            })?;
        let body: serde_json::Value =
            response.json().await.map_err(|_| Status::internal("Unexpected error! Please contact us!"))?;
        if body["success"] == true {
            return Ok(());
        }
        let message = body["message"].as_str().unwrap_or_default().to_owned();
        Err(match body["error"].as_str() {
            Some("UNAUTHENTICATED") => Status::unauthenticated(message),
            Some("NOT_FOUND") => Status::not_found(message),
            Some("PERMISSION_DENIED") => Status::permission_denied(message),
            Some("INTERNAL") => Status::internal(message),
            Some("UNKNOWN") => Status::unknown(message),
            _ => Status::internal("Unexpected error! Please contact us!"),
        })
    }

    async fn ask<T>(
        &self,
        room: &str,
        cmd: impl FnOnce(tokio::sync::oneshot::Sender<T>) -> RoomApiCmd,
    ) -> Result<T, Status> {
        let handle = room_actor::get_or_spawn(&self.state, room);
        let (reply, answer) = tokio::sync::oneshot::channel();
        handle.send(RoomCmd::Api(cmd(reply))).await.map_err(|_| Status::unavailable("The room is closing"))?;
        answer.await.map_err(|_| Status::internal("The room did not answer"))
    }
}

type Streamed<T> = Pin<Box<dyn Stream<Item = Result<T, Status>> + Send>>;

#[tonic::async_trait]
impl RoomApi for Api {
    async fn read_variable(
        &self,
        request: Request<api::VariableRequest>,
    ) -> Result<Response<prost_types::Value>, Status> {
        self.authorize(&request, &request.get_ref().room).await?;
        let r = request.into_inner();
        let value = self.ask(&r.room, |reply| RoomApiCmd::Read { name: r.name.clone(), reply }).await?;
        // A variable never set, with no default: an empty Value.
        let value = value.and_then(|v| serde_json::from_str::<serde_json::Value>(&v).ok());
        Ok(Response::new(value.as_ref().map(wire::json_to).unwrap_or_default()))
    }

    type listenVariableStream = Streamed<prost_types::Value>;

    async fn listen_variable(
        &self,
        request: Request<api::VariableRequest>,
    ) -> Result<Response<Self::listenVariableStream>, Status> {
        self.authorize(&request, &request.get_ref().room).await?;
        let r = request.into_inner();
        let handle = room_actor::get_or_spawn(&self.state, &r.room);
        let (tx, rx) = tokio::sync::mpsc::channel(64);
        handle
            .send(RoomCmd::Api(RoomApiCmd::ListenVariable { name: r.name, tx }))
            .await
            .map_err(|_| Status::unavailable("The room is closing"))?;
        // The stream holds the room's handle: the room lives as long as somebody listens.
        let stream = tokio_stream::wrappers::ReceiverStream::new(rx).map(move |value: String| {
            let _room = &handle;
            let json = serde_json::from_str::<serde_json::Value>(&value).unwrap_or(serde_json::Value::Null);
            Ok(wire::json_to(&json))
        });
        Ok(Response::new(Box::pin(stream)))
    }

    async fn save_variable(&self, request: Request<api::SaveVariableRequest>) -> Result<Response<()>, Status> {
        self.authorize(&request, &request.get_ref().room).await?;
        let r = request.into_inner();
        // JSON.stringify(value): an unset Value is `undefined`, stored as nothing.
        let value = r.value.as_ref().map(|v| wire::json_from(v).to_string()).unwrap_or_default();
        self.ask(&r.room, |reply| RoomApiCmd::Save { name: r.name.clone(), value, reply })
            .await?
            .map_err(Status::internal)?;
        Ok(Response::new(()))
    }

    async fn broadcast_event(&self, request: Request<api::DispatchEventRequest>) -> Result<Response<()>, Status> {
        self.authorize(&request, &request.get_ref().room).await?;
        let r = request.into_inner();
        // Nobody there: nothing to do, the room is not brought up for it.
        if let Some(room) = self.state.rooms.get(&r.room) {
            let _ = room
                .send(RoomCmd::Event { sender: None, name: r.name, data: r.data, targets: r.target_user_ids })
                .await;
        }
        Ok(Response::new(()))
    }

    type listenToEventStream = Streamed<api::EventResponse>;

    async fn listen_to_event(
        &self,
        request: Request<api::EventRequest>,
    ) -> Result<Response<Self::listenToEventStream>, Status> {
        self.authorize(&request, &request.get_ref().room).await?;
        let r = request.into_inner();
        let handle = room_actor::get_or_spawn(&self.state, &r.room);
        let (tx, rx) = tokio::sync::mpsc::channel(64);
        handle
            .send(RoomCmd::Api(RoomApiCmd::ListenEvent { name: r.name, tx }))
            .await
            .map_err(|_| Status::unavailable("The room is closing"))?;
        let stream = tokio_stream::wrappers::ReceiverStream::new(rx).map(move |(data, sender_id)| {
            let _room = &handle;
            Ok(api::EventResponse { data, sender_id })
        });
        Ok(Response::new(Box::pin(stream)))
    }
}
