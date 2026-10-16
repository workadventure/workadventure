# syntax=docker/dockerfile:1
# Build context: server-go/ (the contract of dev/stack.yaml).
# The production image (--target prod) also needs two named contexts, to compute API_VERSION as the front does:
#   docker build --target prod \
#     --build-context messages=messages --build-context jsonmessages=libs/messages/src/JsonMessages \
#     --build-arg VERSION=<version of play/package.json> server-go
# (from the repository root; a given --build-arg API_VERSION=... wins over the computed one).

# Hot reload. dev/stack.yaml bind-mounts the repository on /usr/src/app and runs SERVER_COMMAND (dev.env).
FROM golang:1.27-bookworm AS dev
RUN go install github.com/air-verse/air@v1.67.4

# apiVersionHash, exactly like ./api-version.sh: the front reloads when its hash differs from the server's.
FROM debian:bookworm-slim AS api-version
COPY --from=messages protos/messages.proto /src/messages/protos/messages.proto
COPY --from=jsonmessages . /src/libs/messages/src/JsonMessages/
RUN cd /src/messages && sha1sum protos/messages.proto ../libs/messages/src/JsonMessages/* | sha1sum | cut -c1-8 > /api-version

FROM golang:1.27-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=api-version /api-version /api-version
ARG API_VERSION=""
ARG VERSION=dev
RUN v="${API_VERSION:-$(cat /api-version)}" && \
    CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.apiVersion=$v -X main.version=${VERSION}" -o /server ./cmd/server && \
    mkdir -p /out/maps

FROM gcr.io/distroless/static-debian12:nonroot AS prod
COPY --from=build /server /server
# Maps live in /maps (map-storage's image did the same); mount a volume there to keep them.
COPY --from=build --chown=nonroot:nonroot /out/maps /maps
ENV STORAGE_DIRECTORY=/maps SERVER_MAP_STORAGE_PORT=3002
# 3000 HTTP, 3001 WebSocket (the pusher's two ports), 3002 map-storage, 50051 Room API (when ROOM_API_SECRET_KEY).
# Probes: GET /ping and /ready on 3000.
EXPOSE 3000 3001 3002 50051
ENTRYPOINT ["/server"]
