# Socle + stacks

Run the current TypeScript servers and the candidate monoliths (`server-go/`, `server-rust/`) side by side, and point
the same Playwright suite at each. Additive: `docker-compose.yaml` and the usual dev workflow are untouched.

- **Socle** (`socle.yaml`, project `wa-socle`, started once): Traefik, the compiled front (`front`), the test maps,
  the OIDC mock, Synapse, LiveKit (with its Redis), the icon server, redisinsight with `--profile tools`, and the
  recording chain (LiveKit egress, S3 on rustfs, `cdn-livekit.` host) with `--profile recording`. Network `wa-socle`.
- **Stack** (`stack.yaml`, project `wa-<name>`, one per server): its own Redis and maps volume, and either
  - `ts`: the pusher, back, map-storage and uploader images published on ghcr.io for `WA_TAG` (no build, no Vite;
    the pusher serves the socle's front through `ASSETS_URL`), or
  - `server`: a candidate built from its folder, with hot reload.

Only Traefik publishes ports. Nothing heavy is built locally: the front is copied out of the published play image.
To run local, uncommitted TypeScript changes, keep using `docker-compose.yaml`.

## Commands

```bash
dev/dev socle up                    # once
dev/dev stack up ts                 # http://play.ts.workadventure.localhost/
dev/dev stack up ts2                # a second one, in parallel
dev/dev stack up go --variant server          # builds server-go/ (see the contract below)
dev/dev stack up ph --variant server --server-dir dev/placeholder   # placeholder answering /ping
dev/dev status                      # projects, memory, URLs
dev/dev stack down ts [-v]          # -v also drops its maps volume
dev/dev socle down
```

`dev/.env` (ignored by git) holds local overrides. Next to the regular stack, which holds port 80:

```bash
SOCLE_HTTP_PORT=8880
SOCLE_LIVEKIT_TCP_PORT=17891
SOCLE_LIVEKIT_UDP_PORT=17892
```

`WA_TAG` picks the published images (default: `master-<sha>` of the commit both candidates start from).

## Addresses

Per stack: `play.<name>.workadventure.localhost` (page, HTTP APIs, `/ws/`), `room-api.<name>…` (gRPC, h2c),
`map-storage.<name>…`, `uploader.<name>…`. Socle: `front.`, `maps.`, `oidc.`, `matrix.`, `livekit.`, `icon.`,
`traefik.` (dashboard), `redis.` + `workadventure.localhost`. All on `SOCLE_HTTP_PORT`.

Containers reach the same public URLs: Traefik listens on that port inside the network too, with the socle host
names as aliases. Inside a stack, services address each other by container name (`wa-<name>-back-1`): every stack
joins `wa-socle`, where plain service names (`back`, `redis`) would resolve to any stack.

## Playwright

One campaign at a time on the machine: `dev/dev test <stack> <specs>` waits for the slot (a lock in the git dir all
worktrees share), runs under `caffeinate` with one worker and the stack's variables, and frees the slot when done.

```bash
cd tests
eval "$(../dev/dev env ts)"         # PLAY_URL, MAPS_DOMAIN, MAP_STORAGE_ENDPOINT, MATRIX_*
node ../dev/warm-auth.mjs Alice Bob Admin1
npx playwright test tests/meeting.spec.ts --project=chromium
```

`warm-auth.mjs` works around a race in the test helper: `createUser` clicks "Save" on the camera screen before
`getUserMedia` resolves, so `EnableCameraScene.submit()` saves no device and users arrive with camera and microphone
off (`bg-danger`). It saves `tests/.auth/<name>.json` the way `createUser` does, which then reuses it for an hour.
Specs that reboot the back or the pusher (`variables`) restart the stack's own containers instead: `dev/dev env`
exports `DEV_REBOOT_BACK` and `DEV_REBOOT_PLAY` (the candidate's `server` for both). `docker-compose.yaml` is never
touched. The socle's Traefik serves every stack: the helpers that stop it refuse unless `DEV_TRAEFIK=wa-socle-traefik-1`
is set, which only makes sense when no other stack is under test. `spaces.spec.ts` checks the TS back itself and does
not apply.

Specs that call `resetWamMaps` (map editor, raise hand, megaphone) upload `map-storage/tests/assets.zip`, which git
ignores. Build it for the stack under test with `dev/dev assets <name>`: the test WAMs load their entity collections
from `http://play.workadventure.localhost`, the regular stack, and the command points them at that stack instead.

`room-api.spec.ts` imports the Room API client, generated as in the CI: run `npm ci && npm run ts-proto` once in
`libs/room-api-clients/room-api-client-js`. `recording.spec.ts` needs `dev/dev socle up --profile recording`; the
egress starts a headless Chrome per recording, so leave the profile off otherwise.

The stacks' environment follows `.env.template` and the CI's end-to-end setup (`docker-compose.e2e.yml`, and the
`sed` lines of the workflow): map editing rights come from the OIDC tags, and the third-party apps are on.
`dev/dev env` also sets `NO_KLAXOON_SECRET=true`: without a Klaxoon client id, those specs skip, as on forks.

Checked on `ts` and on `ts2` running in parallel: `meeting.spec.ts` (two users in a bubble), `oidc.spec.ts`, and
`livekit.spec.ts` "4 cameras".

## Load bench

`dev/bench/` runs the same generators against TS, Go and Rust on two dedicated machines, at the end of each
milestone: see `dev/bench/README.md`. `dev/bench-2026-10-14/` keeps the first comparison, made on a Mac.

## Contract of the `server` variant

The candidate folder (`SERVER_DIR`, default `server-<name>`) holds:

- `dev.env`, loaded by `dev/dev`: `SERVER_COMMAND` (required: the hot-reload command, e.g. `air` or
  `cargo watch -x run`), and optionally `SERVER_DOCKERFILE` (default `Dockerfile`), `SERVER_TARGET` (default `dev`),
  and the `SERVER_*_PORT` below. Single-quote values that the container must expand.
- a Dockerfile with that target: the toolchain and the watcher. The build context is the candidate folder.

At run time:

- **Files.** The repo is bind-mounted at `/usr/src/app` (protos in `messages/protos`, `libs/map-editor`…), working
  directory `/usr/src/app/<SERVER_DIR>`. Volumes: `/maps` (map storage, per stack), `/cache` (build caches, e.g.
  `CARGO_TARGET_DIR=/cache/target`, `GOCACHE=/cache/go`: the bind mount is slow on macOS).
- **Environment.** Everything under `x-env` in `stack.yaml`, the merged configuration of today's four services, plus
  `SERVER_*_PORT`. `API_URL`, `MAP_STORAGE_URL` and `INTERNAL_MAP_STORAGE_URL` point to TS services that this
  variant does not run: they become in-process calls. `REDIS_HOST` is the stack's Redis.
- **Ports and routes** (no published port; Traefik routes, router names `wa-<name>-*`):

  | Route | Today | Port variable (default) |
  |---|---|---|
  | `play.<name>…` — HTML page, HTTP APIs, OIDC callbacks, `/ping` | pusher :3000 | `SERVER_HTTP_PORT` (3000) |
  | `play.<name>…/ws/` — the front's WebSocket | pusher :3001 | `SERVER_WS_PORT` (3001) |
  | `room-api.<name>…` — Room API, gRPC over h2c | pusher :50051 | `SERVER_ROOM_API_PORT` (50051) |
  | `map-storage.<name>…` | map-storage :3000 | `SERVER_MAP_STORAGE_PORT` (3002) |
  | `uploader.<name>…` | uploader :8080 | `SERVER_UPLOADER_PORT` (3003) |

  Set several variables to the same port to serve them from one listener (dispatch on the `Host` header).
- **Readiness.** `GET /ping` answers 200: `dev/dev stack up` waits for it.
- **The page.** Fetch the template from `ASSETS_INTERNAL_URL/index.html` (the socle's front) and render it like
  `FrontController`, assets pointing to `ASSETS_URL`. The front checks `apiVersionHash` (protos) on the WebSocket: a
  candidate built on the same commit matches.

## What was checked (2026-10-13)

- **OIDC.** The mock's redirect pattern `http://*.workadventure.localhost` accepts every stack's
  `http://play.<name>.workadventure.localhost:<port>/openid-callback` and Synapse's callback: nothing per stack.
  Synapse's SSO `client_whitelist` is a prefix match, so `synapse-start.sh` replaces it with `http://play.`.
- **LiveKit.** Shared without collision: room names are space names, prefixed by the world, which without an admin
  is the origin of the room URL (`http://play.<name>.workadventure.localhost:<port>.…`). With an admin API, two stacks
  on the same world would share rooms; then give each stack its own LiveKit. No webhook is configured (as in
  `docker-compose.yaml`). The egress (profile `recording`) is shared too and writes to the `livekit-recording`
  bucket, one file per recording. Media reach LiveKit through Traefik's TCP/UDP
  entry points; LiveKit advertises `127.0.0.1` and the same ports as the host.
- **Synapse.** Shareable. Per stack: `MATRIX_API_URI`, `MATRIX_PUBLIC_URI`, `MATRIX_DOMAIN` and the admin
  credentials; `SECRET_KEY` must equal Synapse's `JWT_SECRET`. Data is not isolated: Matrix users (one per email)
  and the "current visited room" space are common to all stacks; area rooms are per map, so per stack.
- **Memory** (`docker stats`, after the specs): socle 376 MiB (Synapse 121, OIDC mock 97, LiveKit 83, Traefik 42,
  maps 18, front 10, icon 4); `ts` stack 715 MiB and `ts2` 833 MiB (back 199–309, pusher ~240, map-storage ~160,
  uploader ~115, Redis 7); placeholder stack 4 MiB.

## Pitfalls

- The socle's Traefik only reads containers labelled `wa.stack=true`, and stacks do not set `traefik.enable`: the
  regular stack's Traefik (`exposedbydefault=false`) ignores them. Socle routes are in `socle-routes.yaml`, not in
  labels, for the same reason (the OIDC mock's inherited labels are disabled).
- Compose interpolates values, not mapping keys: labels are a list so that `wa-${STACK}` works in router names.
- The OIDC mock `extends` `docker-compose.yaml`, so `dev/dev` passes `--env-file .env.template` to silence its
  variables.
- The pusher refuses to start without `ICON_URL`.
