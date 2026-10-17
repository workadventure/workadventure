#!/usr/bin/env sh
# Same load against the server limited to 1, 2 and 4 CPUs (rule 7 of the comparison).
# The load generator runs in its own container, with its own CPUs, on a private network.
#
#   bench/cpus.sh                       # 40 rooms x 25 players, 60 s
#   ROOMS=1 USERS=400 bench/cpus.sh     # one big room
#
# IMAGE is the server under test, LOAD_IMAGE holds wa-load (it speaks the frozen protocol, so it can load any
# candidate). Build: docker build --build-context protos=../messages/protos \
#   --build-context pusherdata=../play/src/pusher/data --target prod -t wa-server-rust:prod .
set -eu
IMAGE=${IMAGE:-wa-server-rust:prod}
LOAD_IMAGE=${LOAD_IMAGE:-wa-server-rust:prod}
ROOMS=${ROOMS:-40}
USERS=${USERS:-25}
DURATION=${DURATION:-60}
LOAD_CPUS=${LOAD_CPUS:-6}
SERVER_MEM=${SERVER_MEM:-1g}
LOAD_MEM=${LOAD_MEM:-3g}
CPUS_LIST=${CPUS_LIST:-1 2 4}
NET=wa-bench
SERVER=wa-bench-server

docker network inspect $NET >/dev/null 2>&1 || docker network create $NET >/dev/null
for cpus in $CPUS_LIST; do
    docker rm -f $SERVER >/dev/null 2>&1 || true
    docker run -d --name $SERVER --network $NET --cpus "$cpus" -m "$SERVER_MEM" \
        -e SECRET_KEY=bench -e PROMETHEUS_AUTHORIZATION_TOKEN=bench -e RUST_LOG=warn "$IMAGE" >/dev/null
    sleep 2
    result=$(docker run --rm --network $NET --cpus "$LOAD_CPUS" -m "$LOAD_MEM" --ulimit nofile=65536 "$LOAD_IMAGE" \
        wa-load --server http://$SERVER:3000 --rooms "$ROOMS" --users "$USERS" --duration "$DURATION" \
        --metrics-token bench)
    peak=$(docker stats --no-stream --format '{{.MemUsage}}' $SERVER | cut -d/ -f1)
    oom=$(docker inspect -f '{{.State.OOMKilled}}' $SERVER)
    workers=$(docker run --rm --network $NET curlimages/curl:8.11.1 -s -H "Authorization: Bearer bench" \
        http://$SERVER:3000/metrics | awk '/^workadventure_server_worker_threads/ {print $2}')
    echo "{\"cpus\":$cpus,\"workers\":${workers:-null},\"server_memory\":\"$peak\",\"oom_killed\":$oom,\"load\":$result}"
done
docker rm -f $SERVER >/dev/null 2>&1 || true
