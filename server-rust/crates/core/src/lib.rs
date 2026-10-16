//! The business core. It imports no transport, no Redis and no protobuf types: adapters translate.

pub mod areas;
pub mod geometry;
pub mod room;
pub mod social;
pub mod space;
pub mod space_state;
pub mod spatial;
pub mod user;
pub mod variables;
pub mod wam;
pub mod wam_properties;

pub use room::{Clock, Event, GroupId, Room, RoomConfig, Sink, UserId};
