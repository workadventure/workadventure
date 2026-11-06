#!/bin/sh
# Starts the SaaS admin + the Go server (project wa-saas-go). SEED=1 forces migrate:fresh --seed; REBUILD_GO=1 rebuilds the image.
set -eu
. "$(dirname "$0")/common.sh"

# Prerequisites: port 80 free (unless it is already ours), memory.
if nc -z localhost 80 2>/dev/null && [ -z "$(dc ps -q traefik 2>/dev/null)" ]; then echo "port 80 is busy: stop what uses it" >&2; exit 1; fi
echo "Docker VM memory: $(docker info --format '{{.MemTotal}}') bytes; needs ~3 GB free"

IMG=wa-saas-go-server:local
if [ "${REBUILD_GO:-}" = 1 ] || ! docker image inspect "$IMG" >/dev/null 2>&1; then
  docker build --target prod --build-arg "API_VERSION=$(sh "$GO_SRC/api-version.sh")" --build-arg VERSION=1.0.0 -t "$IMG" "$GO_SRC"
fi

dc up -d
echo "Waiting for the admin..."
until curl -sf -o /dev/null -H 'Host: admin.workadventure.localhost' http://localhost/images/general/logo.svg; do sleep 5; done
echo "Waiting for the Go server..."
until curl -sf -o /dev/null -H 'Host: play.workadventure.localhost' http://localhost/ready; do sleep 2; done

n=$(dc exec -T db mysql -uworkadventure -pworkadventure workadventure -Nse 'select count(*) from worlds' 2>/dev/null || echo 0)
if [ "${SEED:-}" = 1 ] || [ "${n:-0}" = 0 ]; then
  dc exec -T admin php artisan migrate:fresh --seed --force
fi
echo "Ready: http://play.workadventure.localhost/@/wa/workadventure-premium/public  http://whitelabel.localhost/@/my/home"
