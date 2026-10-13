# syntax=docker/dockerfile:1
# Build context: server-go/ (the contract of dev/stack.yaml).

# Hot reload. dev/stack.yaml bind-mounts the repository on /usr/src/app and runs SERVER_COMMAND (dev.env).
FROM golang:1.27-bookworm AS dev
RUN go install github.com/air-verse/air@v1.67.4

FROM golang:1.27-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# API_VERSION must match the front: ./api-version.sh on the same commit. VERSION: "version" of play/package.json.
ARG API_VERSION=dev
ARG VERSION=dev
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.apiVersion=${API_VERSION} -X main.version=${VERSION}" -o /server ./cmd/server

# docker build --target prod --build-arg API_VERSION=$(./api-version.sh) server-go
FROM gcr.io/distroless/static-debian12:nonroot AS prod
COPY --from=build /server /server
EXPOSE 3000 3001
ENTRYPOINT ["/server"]
