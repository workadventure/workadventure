//! Generates the Rust types from the shared `.proto` files, without needing `protoc` (protox is a pure Rust
//! protobuf compiler), so the build is the same on the host and in Docker.

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let protos_dir = std::env::var("WA_PROTOS_DIR").unwrap_or_else(|_| "../../../messages/protos".to_owned());
    println!("cargo:rerun-if-env-changed=WA_PROTOS_DIR");
    println!("cargo:rerun-if-changed={protos_dir}");

    let descriptors = protox::compile(["messages.proto", "room-api.proto"], [protos_dir])?;
    let mut config = prost_build::Config::new();
    // Binary fields stay reference-counted: an uploaded file is fanned out without copies.
    config.bytes(["."]);
    // The Room API's gRPC service (server side only) comes with the types.
    tonic_prost_build::configure().build_client(false).compile_fds_with_config(descriptors, config)?;
    Ok(())
}
