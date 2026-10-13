//! The business core. It imports no transport, no Redis and no protobuf types: adapters translate.

pub mod geometry;
pub mod room;
pub mod space;
pub mod spatial;
pub mod user;

pub use room::{Clock, Event, GroupId, Room, RoomConfig, Sink, UserId};
