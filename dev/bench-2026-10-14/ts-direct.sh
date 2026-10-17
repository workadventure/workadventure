#!/usr/bin/env bash
# Same as ts-load.sh, straight to the pusher (no Traefik). Usage: ts-load.sh <rooms> <users> [rate]
# Output: loadbot's JSON + CPU (avg %) of pusher and back during the window + their memory.
set -euo pipefail
ROOMS=$1 USERS=$2 RATE=${3:-10}
SP=$(cd "$(dirname "$0")" && pwd)
DURATION=${DURATION:-30s} WARMUP=${WARMUP:-15s} BOT_CPUS=${BOT_CPUS:-4}
TRAEFIK_IP=$(docker inspect -f '{{(index .NetworkSettings.Networks "wa-socle").IPAddress}}' wa-socle-traefik-1)
CPU=$(mktemp)
( sleep "${WARMUP%s}"; end=$(( $(date +%s) + ${DURATION%s} ))
  while [ "$(date +%s)" -lt $end ]; do docker stats --no-stream --format '{{.Name}} {{.CPUPerc}}' wa-ts-play-1 wa-ts-back-1 wa-dsc-bot; done ) > "$CPU" 2>/dev/null &
sampler=$!
result=$(docker run --rm --name wa-dsc-bot --network wa-socle \
    --cpus "$BOT_CPUS" -m 1g -v "$SP/bin:/app:ro" busybox:1.37 /app/loadbot \
    -http http://wa-ts-play-1:3000 -ws http://wa-ts-play-1:3001 -version b82fc568 \
    -map 'maps.workadventure.localhost:8880/tests/E2E/empty.json?room=%d' \
    -rooms "$ROOMS" -users "$USERS" -rate "$RATE" -side 1600 -warmup "$WARMUP" -duration "$DURATION")
wait $sampler || true
avg() { grep "^$1 " "$CPU" | tr -d '%' | awk '{ s += $2; n++ } END { if (n) printf "%.0f", s / n; else print 0 }'; }
mem() { docker stats --no-stream --format '{{.MemUsage}}' "$1" | cut -d/ -f1 | tr -d ' '; }
echo "${result%\}},\"rooms\":$ROOMS,\"users\":$USERS,\"rate\":$RATE,\"pusher_cpu\":$(avg wa-ts-play-1),\"back_cpu\":$(avg wa-ts-back-1),\"bot_cpu\":$(avg wa-dsc-bot),\"pusher_mem\":\"$(mem wa-ts-play-1)\",\"back_mem\":\"$(mem wa-ts-back-1)\"}"
rm -f "$CPU"
