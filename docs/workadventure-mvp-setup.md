# WorkAdventure Saved Workspace MVP Setup

Date: 2026-03-15

## What exists now

This repo currently ships one named task workspace:

- `e2e-fix`

It is split into 4 runnable parts:

1. **WorkAdventure shell** for the room/map entry
2. **Published map** under `maps/e2e-fix-mvp/`
3. **Workspace app** under `workspace-app/`
4. **Optional local services**:
   - ttyd bridges
   - Finder file service

## Delivered directories

- `workadventure-workspace/` → map-starter-kit based map source
- `workspace-app/` → dock-only desktop workspace app
- `workspace-config/e2e-fix.json` → app/node config
- `scripts/` → local terminal bridge and file-service helpers

## Current UX

The current accepted UI is:

- empty desktop by default
- no top bar
- no sidebar
- only a bottom dock
- clicking a dock icon opens a floating app window

## Prerequisites

- Docker Desktop
- Node.js 18+
- `ttyd`
- local host aliases for WorkAdventure

## 0. Add local hosts entries

Add this line to `/etc/hosts` if needed:

```txt
127.0.0.1 play.workadventure.localhost traefik.workadventure.localhost maps.workadventure.localhost map-storage.workadventure.localhost api.workadventure.localhost front.workadventure.localhost uploader.workadventure.localhost icon.workadventure.localhost redis.workadventure.localhost oidc.workadventure.localhost extra.workadventure.localhost matrix.workadventure.localhost livekit.workadventure.localhost
```

## 1. Start the WorkAdventure shell

From repo root:

```bash
docker compose -f docker-compose.yaml -f docker-compose-no-oidc.yaml up -d
```

This repo `.env` points to:

```txt
START_ROOM_URL=/_/global/maps.workadventure.localhost/e2e-fix-mvp/e2e-fix-ops-room.tmj
```

## 2. Start the workspace app

```bash
cd workspace-app
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5174/?workspace=e2e-fix
```

To force a clean desktop:

```text
http://127.0.0.1:5174/?workspace=e2e-fix&resetLayout=1
```

## 3. Start terminal bridges

### Codex terminal

```bash
ttyd -W -i 127.0.0.1 -p 7681 zsh
```

### Docker Ubuntu terminal

Quick disposable mode:

```bash
ttyd -W -i 127.0.0.1 -p 7682 docker run --rm -it ubuntu:22.04 bash
```

Preferred long-lived mode:

```bash
./scripts/start_e2e_fix_ubuntu_container.sh
ttyd -W -i 127.0.0.1 -p 7682 docker exec -it e2e-fix-ubuntu bash
```

## 4. Start Finder file service

```bash
cd workspace-app
npm run files
```

Health:

```text
http://127.0.0.1:4175/health
```

## 5. Open the MVP

Open:

```text
http://play.workadventure.localhost/
```

If root still behaves oddly, open the direct room URL:

```text
http://play.workadventure.localhost/_/global/maps.workadventure.localhost/e2e-fix-mvp/e2e-fix-ops-room.tmj
```

## What you should see

### On map open

You spawn near the left green task monitor in the `e2e-fix` ops room.

### On workstation trigger

A popup appears:

- `Open saved workspace “e2e-fix”?`

### Inside the workspace app

You should see:

- an empty desktop background
- a bottom dock with 6 task apps

Dock apps:

1. GitHub
2. ChatGPT
3. Codex Terminal
4. Docker Ubuntu Terminal
5. Review / Update
6. Finder

Each app opens as a floating window.

## Local validation checklist

1. `http://127.0.0.1:5174/?workspace=e2e-fix&resetLayout=1` shows an empty desktop + dock
2. clicking a dock icon opens a floating window
3. `http://127.0.0.1:7681` opens the Codex ttyd endpoint
4. `http://127.0.0.1:7682` opens the Docker ttyd endpoint
5. `http://127.0.0.1:4175/health` returns Finder health JSON
6. `http://play.workadventure.localhost/` lands in the `e2e-fix` map

## Known gotchas

### 1. Old `localhost:5173` room restore

WorkAdventure may restore an old cached room URL from browser storage.

This repo now filters stale `lastRoomUrl` values in:

- `play/src/front/Connection/ConnectionManager.ts`
- `play/src/front/Connection/LocalUserStore.ts`

If a browser still keeps bad local state, clear it once and retry.

### 2. Use Playwright Chromium for UI verification

For future Codex sessions, install browser tooling early:

```bash
npx playwright install chromium
```

Then self-check:

```bash
npx playwright screenshot --browser chromium 'http://127.0.0.1:5174/?workspace=e2e-fix&resetLayout=1' /tmp/workspace.png
```

### 3. Do not trust stale UI docs

Older docs in this branch still mention:

- tiled layout
- visible top shell
- sidebar navigation

The accepted current UI is the dock-only desktop.
