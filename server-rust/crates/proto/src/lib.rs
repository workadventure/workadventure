//! The wire contract. Only adapters (the `server` crate) may depend on this crate, never `wa-core`.

#[allow(clippy::all, clippy::pedantic, missing_docs)]
pub mod messages {
    // messages.proto has no package: prost names the file `_.rs`.
    include!(concat!(env!("OUT_DIR"), "/_.rs"));
}

#[allow(clippy::all, clippy::pedantic, missing_docs)]
pub mod room_api {
    include!(concat!(env!("OUT_DIR"), "/room_api.rs"));
}

pub use prost::Message;
