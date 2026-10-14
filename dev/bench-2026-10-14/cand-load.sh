#!/usr/bin/env bash
# Same patched Go loadbot against a candidate limited to N CPUs. Usage: cand-load.sh <go|rust> <cpus> <rooms> <users> [rate]
set -euo pipefail
WHO=$1 CPUS=$2 ROOMS=$3 USERS=$4 RATE=${5:-10}
SP=$(cd "$(dirname "$0")" && pwd)
DURATION=${DURATION:-30s} WARMUP=${WARMUP:-15s} BOT_CPUS=${BOT_CPUS:-4}
NET=wa-dsc-bench SERVER=wa-dsc-$WHO BOT=wa-dsc-bot
docker rm -f $SERVER >/dev/null 2>&1 || true
if [ "$WHO" = go ]; then
  docker run -d --name $SERVER --network $NET --cpus "$CPUS" -m 1g -v "$SP/bin:/app:ro" -e SECRET_KEY=bench busybox:1.37 /app/wa-server-go >/dev/null
else
  docker run -d --name $SERVER --network $NET --cpus "$CPUS" -m 1g -e SECRET_KEY=bench -e RUST_LOG=warn wa-server-rust:prod >/dev/null
fi
for _ in $(seq 50); do docker run --rm --network $NET busybox:1.37 wget -qO- http://$SERVER:3000/ping >/dev/null 2>&1 && break; sleep 0.3; done
CPU=$(mktemp)
( sleep "${WARMUP%s}"; end=$(( $(date +%s) + ${DURATION%s} ))
  while [ "$(date +%s)" -lt $end ]; do docker stats --no-stream --format '{{.Name}} {{.CPUPerc}}' $SERVER $BOT; done ) > "$CPU" 2>/dev/null &
sampler=$!
result=$(docker run --rm --name $BOT --network $NET --cpus "$BOT_CPUS" -m 1g -v "$SP/bin:/app:ro" busybox:1.37 /app/loadbot \
    -http http://$SERVER:3000 -rooms "$ROOMS" -users "$USERS" -rate "$RATE" -side 1600 -warmup "$WARMUP" -duration "$DURATION")
wait $sampler || true
avg() { grep "^$1 " "$CPU" | tr -d '%' | awk '{ s += $2; n++ } END { if (n) printf "%.0f", s / n; else print 0 }'; }
mem=$(docker stats --no-stream --format '{{.MemUsage}}' $SERVER | cut -d/ -f1 | tr -d ' ')
echo "${result%\}},\"who\":\"$WHO\",\"cpus\":$CPUS,\"rooms\":$ROOMS,\"users\":$USERS,\"rate\":$RATE,\"server_cpu\":$(avg $SERVER),\"bot_cpu\":$(avg $BOT),\"server_mem\":\"$mem\"}"
docker rm -f $SERVER >/dev/null 2>&1 || true
rm -f "$CPU"
