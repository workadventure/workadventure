#!/usr/bin/env bash
# Multi-core measurement (rule 7): the same load against the server limited to 1, 2 and 4 CPUs.
#
#   server-go/bench/multicore.sh <rooms> <users per room> [rate] [cpus...]
#
# The server and the load generator (cmd/loadbot) run in two containers on a private network, so that Docker
# Desktop's port forwarding is not measured. The generator gets BOT_CPUS CPUs of its own (default 4). Output: one
# JSON line per run, with the average CPU use (docker stats) of the server and of the generator added: a generator
# near its limit means the measure is the generator's, not the server's.
set -euo pipefail
ROOMS=${1:?rooms}; USERS=${2:?users per room}; RATE=${3:-10}
shift $(( $# < 3 ? $# : 3 ))
CPUS=("$@"); [ $# -eq 0 ] && CPUS=(1 2 4)
DURATION=${DURATION:-30s}; WARMUP=${WARMUP:-15s}; BOT_CPUS=${BOT_CPUS:-4}
cd "$(dirname "$0")/.."
OUT=$(mktemp -d)
ARCH=$(docker info --format '{{.Architecture}}'); case "$ARCH" in aarch64) ARCH=arm64 ;; x86_64) ARCH=amd64 ;; esac
GOOS=linux GOARCH=$ARCH CGO_ENABLED=0 go build -o "$OUT/wa-server" ./cmd/server
GOOS=linux GOARCH=$ARCH CGO_ENABLED=0 go build -o "$OUT/loadbot" ./cmd/loadbot
NET=wa-go-bench SERVER=wa-go-bench-server BOT=wa-go-bench-bot
docker network inspect $NET >/dev/null 2>&1 || docker network create $NET >/dev/null
cleanup() { docker rm -f $SERVER $BOT >/dev/null 2>&1 || true; docker network rm $NET >/dev/null 2>&1 || true; rm -rf "$OUT"; }
trap cleanup EXIT

avg() { grep "^$1 " "$OUT/cpu" | tr -d '%' | awk '{ s += $2; n++ } END { if (n) printf "%.0f", s / n; else print 0 }'; }

for cpus in "${CPUS[@]}"; do
	docker rm -f $SERVER >/dev/null 2>&1 || true
	docker run -d --name $SERVER --network $NET --cpus "$cpus" -m 1g -v "$OUT:/app:ro" \
		-e SECRET_KEY=bench busybox:1.37 /app/wa-server >/dev/null
	for _ in $(seq 50); do docker exec $SERVER wget -qO- localhost:3000/ping >/dev/null 2>&1 && break; sleep 0.2; done
	gomaxprocs=$(docker logs $SERVER 2>&1 | sed -n 's/.*GOMAXPROCS=\([0-9]*\).*/\1/p')
	# Sample CPU during the measurement window only.
	( sleep "${WARMUP%s}"; end=$(( $(date +%s) + ${DURATION%s} ))
	  while [ "$(date +%s)" -lt $end ]; do docker stats --no-stream --format '{{.Name}} {{.CPUPerc}}' $SERVER $BOT; done ) > "$OUT/cpu" 2>/dev/null &
	sampler=$!
	result=$(docker run --rm --name $BOT --network $NET --cpus "$BOT_CPUS" -m 1g -v "$OUT:/app:ro" busybox:1.37 \
		/app/loadbot -http http://$SERVER:3000 -rooms "$ROOMS" -users "$USERS" -rate "$RATE" -warmup "$WARMUP" -duration "$DURATION")
	wait $sampler || true
	mem=$(docker stats --no-stream --format '{{.MemUsage}}' $SERVER | cut -d/ -f1 | tr -d ' ')
	echo "${result%\}},\"cpus\":$cpus,\"gomaxprocs\":${gomaxprocs:-0},\"server_cpu_percent\":$(avg $SERVER),\"loadbot_cpu_percent\":$(avg $BOT),\"server_mem\":\"$mem\"}"
done
