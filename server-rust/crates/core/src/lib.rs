//! The business core. It imports no transport, no Redis and no protobuf types: adapters translate.

pub mod geometry;
pub mod room;
pub mod space;
pub mod space_state;
pub mod spatial;
pub mod user;
pub mod wam;

pub use room::{Clock, Event, GroupId, Room, RoomConfig, Sink, UserId};
