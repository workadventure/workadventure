# syntax=docker/dockerfile:1.7
#
# Build context: server-rust/.
#
# dev: the socle's "server" variant (dev/stack.yaml) bind-mounts the repo at /usr/src/app and runs
#   SERVER_COMMAND from dev.env (cargo watch). Build caches live in the /cache volume.
# prod: a release image. The .proto files and the pusher's data files come from two more contexts:
#   docker build --build-context protos=../messages/protos --build-context pusherdata=../play/src/pusher/data \
#     --target prod -t wa-server-rust .

FROM rust:1.93-bookworm AS base
# CARGO_BUILD_JOBS caps the memory of a build: the Docker VM is shared with the other stacks.
ENV CARGO_TERM_COLOR=always \
    CARGO_BUILD_JOBS=4

FROM base AS dev
RUN cargo install cargo-watch --locked --version 8.5.3
# Outside the bind mount, which is slow on macOS, and kept across restarts.
ENV CARGO_TARGET_DIR=/cache/target \
    CARGO_HOME=/cache/cargo

FROM base AS build
WORKDIR /usr/src/workadventure/server-rust
COPY --from=protos . /usr/src/workadventure/messages/protos
COPY --from=pusherdata . /usr/src/workadventure/play/src/pusher/data
COPY . .
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/src/workadventure/server-rust/target \
    cargo build --release --locked --bin workadventure-server --bin wa-load \
    && cp target/release/workadventure-server target/release/wa-load /usr/local/bin/

FROM debian:bookworm-slim AS prod
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /usr/local/bin/workadventure-server /usr/local/bin/wa-load /usr/local/bin/
USER nobody
EXPOSE 3000
CMD ["workadventure-server"]
