# Codex local setup notes

Date: 2026-03-14

## Goal
Bring up a local self-hosted WorkAdventure dev stack on this macOS machine as the fastest reusable base for the workspace visualization direction.

## What was done
- Cloned repo to `~/Dev/workadventure/workadventure`
- Copied `.env.template` to `.env`
- Used OrbStack as the Docker runtime on macOS
- Configured Docker daemon proxy in `~/.orbstack/config/docker.json`
- Started local stack with:
  - `docker compose -f docker-compose.yaml -f docker-compose-no-oidc.yaml -f docker-compose.no-synapse.yaml up -d`

## Why startup looked slow
This repo starts in development mode, not as a tiny prebuilt app.
On first boot it:
- pulls many Docker images
- runs a monorepo `npm install`
- starts multiple watch/dev services

So the long wait was mostly first-run dependency install and local dev startup, not just one single download.

## Current health checks
Useful commands:

```bash
cd ~/Dev/workadventure/workadventure

docker compose -f docker-compose.yaml -f docker-compose-no-oidc.yaml -f docker-compose.no-synapse.yaml ps

docker logs --tail 120 workadventure-play-1

docker logs --tail 120 workadventure-back-1

curl -I -H 'Host: play.workadventure.localhost' http://127.0.0.1
```

Expected success signal:
- `curl` returns `HTTP/1.1 200 OK`

## Manual step that may still be needed
If `play.workadventure.localhost` does not resolve in the browser, add these hostnames:

```bash
sudo sh -c 'cat >> /etc/hosts <<"HOSTS"
127.0.0.1 oidc.workadventure.localhost redis.workadventure.localhost play.workadventure.localhost traefik.workadventure.localhost matrix.workadventure.localhost extra.workadventure.localhost icon.workadventure.localhost map-storage.workadventure.localhost uploader.workadventure.localhost maps.workadventure.localhost api.workadventure.localhost front.workadventure.localhost livekit.workadventure.localhost
HOSTS'
```

Then open:
- `http://play.workadventure.localhost/`

## Next phase
Once local access is confirmed, adapt the map / display layer for:
- host zones
- nested environments (Windows / WSL / Docker / nested Docker)
- issue / PR / run occupancy
- actor/state visibility
- recent event readability
