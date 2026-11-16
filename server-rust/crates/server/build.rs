//! The woka and companion lists are the pusher's own data files, embedded at build time.
fn main() {
    let dir = std::env::var("WA_PUSHER_DATA_DIR").unwrap_or_else(|_| {
        let manifest = std::env::var("CARGO_MANIFEST_DIR").expect("set by cargo");
        format!("{manifest}/../../../play/src/pusher/data")
    });
    println!("cargo:rerun-if-env-changed=WA_PUSHER_DATA_DIR");
    println!("cargo:rerun-if-changed={dir}");
    println!("cargo:rustc-env=WA_PUSHER_DATA_DIR={dir}");
}
