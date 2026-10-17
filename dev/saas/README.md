# SaaS admin + Go server (project `wa-saas-go`)

A local SaaS environment where the Laravel admin of `workadventure-saas` talks to the Go server (`server-go`: pusher,
play, back, map-storage and uploader in one process). It runs as its own compose project, **`wa-saas-go`**: it never
touches the usual SaaS stack (`workadventure-*`), nor `wa-socle`, `wa-go`, `wa-rust` or minikube. Traefik only follows
the containers of this project (`providers.docker.constraints`).

## Prerequisites

- Docker with about 3 GB free in the VM (the project uses ~2.6 GB: admin 1.5, db 0.5, clickhouse 0.4).
- Port **80 free** (the SaaS Traefik binds it): do not run another SaaS stack at the same time.
- Images already local: `wa-socle-front:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c`,
  `ghcr.io/workadventure/maps:master-6f4d...` (test maps of the seed) and the SaaS images (php, mysql, clickhouse,
  rustfs, traefik). The Go image `wa-saas-go-server:local` is built by `up.sh` from the `lang-go` worktree (read-only),
  with `API_VERSION` from `server-go/api-version.sh` (it must match the front's hash).
- The SaaS checkout at `$SAAS_REPO` (default `/Users/yannisdiarra/Documents/Git/workadventure-saas`) with `admin/vendor`
  and `admin/node_modules`: the admin bind-mounts `./admin`. No tracked file is modified.

## Commands

```sh
dev/saas/up.sh                 # build the Go image if missing, start, wait, seed an empty database
SEED=1 dev/saas/up.sh          # force migrate:fresh --seed (the Go server must be running, it receives the maps)
REBUILD_GO=1 dev/saas/up.sh    # rebuild the Go image
dev/saas/down.sh               # stop, keep the data (DB, S3, maps)
PURGE=1 dev/saas/down.sh       # also drop the volumes of wa-saas-go (-v, this project only)
```

`up.sh` copies `.env.example` to `.env` on the first run (local-only values, no real secret). Compose is called as
`docker compose -p wa-saas-go --project-directory $SAAS_REPO --env-file dev/saas/.env -f docker-compose.yaml -f dev/saas/docker-compose.saas-go.yaml`.

## What the override does

- No `map-storage-saas`, no `messages`, no docs/nft/phpmyadmin: only traefik, admin, db, clickhouse, rustfs (+init),
  redis, mailhog, maps, front and server.
- Admin: `PRIVATE_MAP_STORAGE_URL=http://server:3002`, `MAP_STORAGE_AUTHENTICATION_TOKEN` = the server's
  `AUTHENTICATION_TOKEN`, `PUSHER_URL=http://pusher.workadventure.localhost`, OIDC client secret taken from
  `OPENID_CLIENT_SECRET` on both sides. Shared: `ADMIN_API_TOKEN`, `ADMIN_SOCKETS_TOKEN`, `SECRET_KEY`.
- Server: `ADMIN_API_URL=http://admin`, OIDC on `http://member.workadventure.localhost`, `USE_DOMAIN_NAME_IN_PATH=true`,
  `AUTHENTICATION_VALIDATOR_URL`, `WAM_TEMPLATE_URL`, `WEB_HOOK_URL`, `WEB_HOOK_API_TOKEN`, template of the front read
  on `ASSETS_INTERNAL_URL=http://front`. Maps live in the volume `wa-saas-go_gomaps` (`/maps`).
- Traefik: catch-all (`HostRegexp(^.+$)`, priority 1) to 3000, `/ws/` to 3001, `room-api.` h2c to 50051,
  `*.map-storage.workadventure.localhost` to 3002, `uploader.` to 3003; the front gets a CORS header.

## URLs (browsers resolve `*.localhost` themselves; with curl, send the `Host` header to localhost:80)

| What | URL |
|---|---|
| Admin / member | http://admin.workadventure.localhost , http://member.workadventure.localhost |
| World 1 (public room) | http://play.workadventure.localhost/@/wa/workadventure-premium/public |
| World 7, white label | http://whitelabel.localhost/@/my/home |
| Maps of a world | `http://<slug>-<id>.map-storage.workadventure.localhost/...` (e.g. `white-label-7`, `workadventure-premium-1`) |
| Traefik dashboard | http://traefik.workadventure.localhost |
| Mailhog | http://mailhog.workadventure.localhost |

## Seed accounts (`admin/database/seeders/DatabaseSeeder.php`)

Users `hello@workadventu.re` (admin), `member@workadventu.re`, `testsubscribe@workadventu.re`,
`nomembership@workadventu.re` (passwords: see the seeder). World 1 `workadventure-premium`, world 7
`white-label-7` with `custom_domain=http://whitelabel.localhost` and room `/@/my/home`.

## Quick checks

```sh
curl -s -H 'Host: play.workadventure.localhost' --get --data-urlencode 'playUri=http://play.workadventure.localhost/@/wa/workadventure-premium/public' http://localhost/map
curl -s -H 'Host: white-label-7.map-storage.workadventure.localhost' http://localhost/my/home.wam    # 200
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: workadventure-premium-1.map-storage.workadventure.localhost' http://localhost/my/home.wam   # 404: separate domain folders
# admin -> server (token read in the admin container)
docker compose -p wa-saas-go exec admin sh -c 'curl -s -XPOST -H "Authorization: $ADMIN_API_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"x\"}" http://pusher.workadventure.localhost/global/event'
```

## Known limits

- The seed's `quests` test map (`quests.workadventure.localhost`) is not served: one 404 in the seed log, harmless.
- No Synapse, LiveKit or OIDC mock here: chat and video calls are out of scope.
- The Go server has no health check (distroless image): `up.sh` polls `/ready` through Traefik.
