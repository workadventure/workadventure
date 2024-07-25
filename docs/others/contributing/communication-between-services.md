# WorkAdventure containers explained

This document explains the services that WorkAdventure is made of and the communication
between those different components.

```mermaid
graph LR
    BR[Browser] --> RP
    RP[Reverse-Proxy] --> A
    RP[Reverse-Proxy] --> B
    RP[Reverse-Proxy] --> D
    A[Front] --> B[Pusher]
    B --> A
    B --> C[Back]
    C --> D[Map-Storage]
```

## Reverse-proxy

The role of the reverse-proxy is to distribute web traffic to the appropriate services. Another important role
is to terminate SSL connections. It is the reverse-proxy that will handle HTTPS encoding/decoding.
The play and map-storage containers don't handle the SSL certificates themselves. It is the role of the
reverse-proxy to do so.


## Front container

The "front" container is responsible for serving HTML / JS / CSS static files.
It is a simple webserver (nginx).




## Communication between services

```mermaid
graph LR
    A[Front] -->|ClientToServerMessage over WS| B[Pusher]
    B -->|ServerToClientMessage over WS| A
    B -->|RoomManager GRPC service| C[Back]
    C -->|MapStorage GRPC service| D[Map-Storage]
    B -->|Matrix protocol over HTTP| E[Matrix server]
    A -->|Ajax request to load maps| D
    C --> F[Redis]
```
