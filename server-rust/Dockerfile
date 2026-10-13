# syntax=docker/dockerfile:1.7
#
# Build context: server-rust/. The .proto files come from a second context named "protos":
#   docker build --build-context protos=../messages/protos --target prod .
# (compose: `additional_contexts: { protos: ../messages/protos }`).

FROM rust:1.93-bookworm AS base
WORKDIR /usr/src/workadventure/server-rust
# CARGO_BUILD_JOBS caps the memory of a build: the Docker VM is shared with the other stacks.
ENV CARGO_TERM_COLOR=always \
    CARGO_BUILD_JOBS=4 \
    WA_PROTOS_DIR=/usr/src/workadventure/messages/protos

# Hot reload: sources and protos are bind-mounted, target/ and the cargo registry are named volumes so a
# restart does not rebuild from scratch.
FROM base AS dev
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    cargo install cargo-watch --locked --version 8.5.3
CMD ["cargo", "watch", "--why", "-w", "crates", "-w", "Cargo.toml", "-w", "/usr/src/workadventure/messages/protos", \
     "-x", "run --bin workadventure-server"]

FROM base AS build
COPY --from=protos . /usr/src/workadventure/messages/protos
COPY . .
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/src/workadventure/server-rust/target \
    cargo build --release --locked --bin workadventure-server \
    && cp target/release/workadventure-server /usr/local/bin/

FROM debian:bookworm-slim AS prod
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /usr/local/bin/workadventure-server /usr/local/bin/
USER nobody
EXPOSE 3000
CMD ["workadventure-server"]
