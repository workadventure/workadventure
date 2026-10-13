# syntax=docker/dockerfile:1
# Build context: the root of the repository (the API version hash reads messages/ and libs/messages/).
#   docker build -f server-go/Dockerfile --target prod .
FROM golang:1.27-bookworm AS base
WORKDIR /src/server-go
COPY server-go/go.mod server-go/go.sum ./
RUN go mod download

# Hot reload: the repository is bind-mounted on /src, air rebuilds on every .go change.
FROM base AS dev
RUN go install github.com/air-verse/air@v1.62.0
CMD ["air", "-c", ".air.toml"]

FROM base AS build
COPY messages/protos /src/messages/protos
COPY libs/messages/src/JsonMessages /src/libs/messages/src/JsonMessages
COPY play/package.json /src/play/package.json
COPY server-go ./
RUN CGO_ENABLED=0 go build -trimpath \
      -ldflags "-s -w -X main.apiVersion=$(./api-version.sh) -X main.version=$(sed -n 's/^  \"version\": \"\(.*\)\",$/\1/p' /src/play/package.json)" \
      -o /server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot AS prod
COPY --from=build /server /server
EXPOSE 3000 3001
ENTRYPOINT ["/server"]
