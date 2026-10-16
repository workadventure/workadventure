# syntax=docker/dockerfile:1
# Build context: server-go/ (the contract of dev/stack.yaml).
# The production image needs API_VERSION, the front's apiVersionHash (./api-version.sh on the same commit; the CI
# computes it), and VERSION, the "version" of play/package.json:
#   docker build --target prod --build-arg API_VERSION=$(server-go/api-version.sh) --build-arg VERSION=... server-go

# Hot reload. dev/stack.yaml bind-mounts the repository on /usr/src/app and runs SERVER_COMMAND (dev.env).
FROM golang:1.27-bookworm AS dev
RUN go install github.com/air-verse/air@v1.67.4

FROM golang:1.27-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG API_VERSION=""
ARG VERSION=dev
# Without the hash, the server would refuse the front's template and never be ready.
RUN test -n "$API_VERSION" || { echo "--build-arg API_VERSION=\$(./api-version.sh) is required" >&2; exit 1; } && \
    CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.apiVersion=${API_VERSION} -X main.version=${VERSION}" -o /server ./cmd/server && \
    mkdir -p /out/maps

FROM gcr.io/distroless/static-debian12:nonroot AS prod
COPY --from=build /server /server
# Maps live in /maps (map-storage's image did the same); mount a volume there to keep them.
COPY --from=build --chown=nonroot:nonroot /out/maps /maps
ENV STORAGE_DIRECTORY=/maps SERVER_MAP_STORAGE_PORT=3002
# 3000 HTTP, 3001 WebSocket (the pusher's two ports), 3002 map-storage, 3003 uploader, 50051 Room API (when ROOM_API_SECRET_KEY).
# Probes: GET /ping and /ready on 3000.
EXPOSE 3000 3001 3002 3003 50051
ENTRYPOINT ["/server"]
