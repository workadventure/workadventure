# Deploying WorkAdventure in production

This directory contains a sample production deployment of WorkAdventure using docker-compose: [`docker-compose.prod.yaml`](docker-compose.prod.yaml).

Every production environment is different and this docker-compose file will not
fit all use cases. But it is intended to be a good starting point for you
to build your own deployment.

In this docker-compose file, you will find:

- A reverse-proxy (Traefik) that dispatches requests to the WorkAdventure containers and handles HTTPS certificates using LetsEncrypt
- A play container (NodeJS) that serves static files for the "game" (HTML/JS/CSS) and is the point of entry for users (you can start many if you want to increase performance)
- A chat container (nginx) that serves static files for the chat bar (HTML/JS/CSS)
- A back container (NodeJS) that shares your rooms information
- An icon container to fetch the favicon of sites imported in iframes
- A Redis server to store values from variables originating from the Scripting API
- A XMPP container that runs a Ejabberd server in charge of the chat / user list

```mermaid
graph LR
    A[Browser] --> B(Traefik)
    subgraph docker-compose
    B --> I(Chat)
    B --> D(Play)
    B --> E(Icon)
    D --> F(Back)
    F --> G(Redis)
    D --> J(XMPP)
    end
    A .-> H(Map)
    F .-> H
```

> **Warning**
> The default docker-compose file does **not** contain a container dedicated to hosting maps. The documentation and
tutorials are relying on GitHub Pages to host the maps. If you want to self-host your maps, you will need to add a simple
HTTP server (nginx / Apache, ...) and properly configure the [CORS settings as explained in the documentation](../../docs/maps/hosting.md).

> **Note**
> The Ejabberd server is used to list all the users connected to your environment and also
> to transmit chat messages. The Ejabberd server proposed in this install comes almost
> unconfigured. There is a basic system set up to authenticate users using JWT. Because
> authentications are using JWT, nothing will be saved.
> If you want to persist messages and use "real accounts", you will need to implement the
> "admin API" (it is the role of the Admin API to give valid credentials to Ejabberd),
> and you will need to modify the Ejabberd configuration to persist messages the way you want
> (using Mnesia or any other supported database)

## Single domain install

The install proposed in [`docker-compose.prod.yaml`](docker-compose.prod.yaml) uses many domain names (one for each service).
If you want to run WorkAdventure on a single domain name, you can override the settings using [`docker-compose.single-domain.yaml`](docker-compose.single-domain.yaml).

In this case, you can configure the only domain used with the `DOMAIN` environment variable in the ".env" file.

Usage:

```console
$ docker-compose -f docker-compose.prod.yaml -f docker-compose.single-domain.yaml up
```
