# Workspace App Server Deployment

Date: 2026-03-15

## Goal

Deploy the current workspace web app as **one standalone Docker container** on your server.

This document covers the workspace app itself.

It does **not** bundle:

- WorkAdventure core services
- ttyd terminal bridges
- Finder file service

Those services can stay external, but the URLs in `workspace-config/e2e-fix.json` must be changed to server-reachable addresses before building.

## Files added for deployment

- `workspace-app/Dockerfile`
- `workspace-app/nginx.default.conf`

## 1. Update runtime URLs before build

Edit:

- `workspace-config/e2e-fix.json`

Replace local browser-only URLs like:

- `http://127.0.0.1:7681`
- `http://127.0.0.1:7682`
- `http://127.0.0.1:4175`

with server-reachable URLs, for example:

```json
{
  "url": "https://workspace.example.com/ttyd/codex"
}
```

or:

```json
{
  "fileServiceUrl": "https://workspace.example.com/files"
}
```

Because the config is bundled into the app, **rebuild after any URL change**.

## 2. Build the image

From repo root:

```bash
docker build -f workspace-app/Dockerfile -t saved-workspace-app:latest .
```

## 3. Run the container

```bash
docker run -d \
  --name saved-workspace-app \
  --add-host=host.docker.internal:host-gateway \
  -p 8080:8080 \
  --restart unless-stopped \
  saved-workspace-app:latest

docker network connect kinopio_default saved-workspace-app
```

Open:

```text
http://YOUR_SERVER_IP:8080/?workspace=e2e-fix
```

Notes:

- `--add-host=host.docker.internal:host-gateway` keeps `/task-api/` and terminal bridges working from inside the container.
- `docker network connect kinopio_default saved-workspace-app` is required for the `Kinopio Notes` node, because the local Kinopio service is running as the `kinopio-server` container on the `kinopio_default` network.

## 4. Recommended reverse proxy

Prefer placing this behind your own domain/reverse proxy:

```text
https://workspace.example.com/?workspace=e2e-fix
```

## 5. If embedding from WorkAdventure

Update the co-website URL in:

- `workadventure-workspace/src/main.ts`

and if needed republish the map copy under:

- `maps/e2e-fix-mvp/`

## 6. Health / smoke check

After deploy, verify:

1. app loads at server URL
2. dock renders
3. clicking one app opens a floating window
4. GitHub / ChatGPT wrappers point to correct URLs
5. terminal/file service URLs are reachable from the browser, not just the server host

## 7. Important deployment caveat

`127.0.0.1` inside browser config means:

- the **end user's machine**

not:

- your server

So for server deployment, local loopback URLs must not remain in bundled config unless the browser is intentionally on the same machine.

## 8. Optional next step

If later you want truly low-friction deploys for new tasks, the next small improvement is:

- generate task-specific JSON
- then rebuild/redeploy this app from that JSON

See:

- `docs/workspace-bootstrap-skill.md`
