#!/usr/bin/env bash
# Common load bench: the same generators against the TS servers, the Go candidate and the Rust candidate, the
# server on one machine and the generator on another. See dev/bench/README.md.
#
#   dev/bench/run-remote.sh <server host> <generator host> [scenario...]
#
# A host is user@address (SSH), or "local": this machine's Docker plays both, for a dry run whose figures are not
# comparable. Scenarios: fixed capacity bigroom realistic storm (all by default).
# Environment: GO_REF (default lang-go), RUST_REF (lang-rust), WA_TAG (TS images), QUICK=1 (tiny loads, one pass),
# PIN (1: one core per CPU, pinned; default 1 remote, 0 local), SERVERS (default "go rust ts"), LABEL (results folder suffix).
set -euo pipefail

SERVER=${1:?server host}; GEN=${2:?generator host}; shift 2
SCENARIOS=${*:-fixed capacity bigroom realistic storm}
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(git -C "$HERE" rev-parse --show-toplevel)
GO_REF=${GO_REF:-lang-go}
RUST_REF=${RUST_REF:-lang-rust}
WA_TAG=${WA_TAG:-master-6f4d02319eddbf46a51cb99ffd38e2d75273593c}
FRONT_HASH=${FRONT_HASH:-b82fc568} # apiVersionHash of the front of WA_TAG: the TS pusher checks it
QUICK=${QUICK:-0}
if [ "$SERVER" = local ]; then PIN=${PIN:-0}; else PIN=${PIN:-1}; fi
if [ "$QUICK" = 1 ]; then WARMUP=${WARMUP:-8}; DURATION=${DURATION:-12}; PASSES=1; else WARMUP=${WARMUP:-30}; DURATION=${DURATION:-60}; PASSES=3; fi
RAMP=${RAMP:-$((DURATION / 2))} # capacity ramp: one shorter pass per step, the edge is then measured in full
OUT=$HERE/results/$(date +%Y-%m-%d-%H%M)-${LABEL:-$([ "$SERVER" = local ] && echo local || echo aws)}
mkdir -p "$OUT"
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$OUT/run.log" >&2; }

# Runs a command on a host. Local: a work dir in the repo (ignored by git); remote: ~/wa-bench.
on() { local h=$1; shift; if [ "$h" = local ]; then bash -c "$*"; else ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$h" "$*"; fi; }
workdir() { if [ "$1" = local ]; then echo "$HERE/.work"; else echo "wa-bench"; fi; }
WS=$(workdir "$SERVER"); WG=$(workdir "$GEN")
SAME=$([ "$SERVER" = "$GEN" ] && echo 1 || echo 0)

prepare_host() { # Docker (+ buildx for the Rust image) on Ubuntu, if missing; prints the docker command to use
	local h=$1
	if [ "$h" != local ] && ! on "$h" 'command -v docker >/dev/null && docker buildx version >/dev/null 2>&1'; then
		log "installing Docker on $h"
		on "$h" 'sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io docker-buildx curl patch >/dev/null && sudo usermod -aG docker "$USER"'
	fi
	if on "$h" 'docker info >/dev/null 2>&1'; then echo docker; else echo "sudo docker"; fi
}
DS=$(prepare_host "$SERVER"); DG=$DS; [ "$SAME" = 1 ] || DG=$(prepare_host "$GEN")

ship() { # ship <host> <workdir> <ref> <dest> <paths...>: a git tree of this repo, without a checkout
	local h=$1 w=$2 ref=$3 dest=$4; shift 4
	on "$h" "rm -rf ${w:?}/${dest:?} && mkdir -p $w/$dest $w/bin"
	git -C "$REPO" archive "$ref" "$@" | on "$h" "tar -x -C $w/$dest"
}
GO_IMAGE=golang:$(git -C "$REPO" show "$GO_REF:server-go/go.mod" | awk '/^go /{split($2,v,"."); print v[1]"."v[2]}')-bookworm
go_build() { # go_build <host> <workdir> <docker> <package> <output>
	on "$1" "$3 run --rm -v \$(cd $2 && pwd)/src-go:/src -v \$(cd $2 && pwd)/bin:/out -v wa-bench-gocache:/root/.cache -w /src/server-go -e CGO_ENABLED=0 $GO_IMAGE go build -o /out/$5 ./$4"
}
rust_build() { # the Rust image holds the candidate and wa-load; built from RUST_REF + wa-load.patch
	ship "$1" "$2" "$RUST_REF" src-rust server-rust messages/protos play/src/pusher/data
	on "$1" "cd $2/src-rust && patch -s -p1" < "$HERE/wa-load.patch"
	on "$1" "cd $2/src-rust && $3 buildx build -q --load --build-context protos=messages/protos --build-context pusherdata=play/src/pusher/data --target prod -t wa-bench-rust server-rust >/dev/null"
}

log "building: $GO_REF ($(git -C "$REPO" rev-parse --short "$GO_REF")), $RUST_REF ($(git -C "$REPO" rev-parse --short "$RUST_REF")), TS $WA_TAG"
ship "$SERVER" "$WS" "$GO_REF" src-go server-go
go_build "$SERVER" "$WS" "$DS" cmd/server wa-server-go
rust_build "$SERVER" "$WS" "$DS"
for i in play back map-storage maps; do on "$SERVER" "$DS pull -q ghcr.io/workadventure/$i:$WA_TAG >/dev/null"; done
if [ "$SAME" = 0 ]; then ship "$GEN" "$WG" "$GO_REF" src-go server-go; rust_build "$GEN" "$WG" "$DG"; fi
on "$GEN" "cd $WG/src-go && patch -s -p1" < "$HERE/loadbot.patch"
go_build "$GEN" "$WG" "$DG" cmd/loadbot loadbot
on "$SERVER" "$DS network inspect wa-bench >/dev/null 2>&1 || $DS network create wa-bench >/dev/null"

# CPUs of the server machine: the first hyperthread of each physical core, then their siblings.
read -r -a PRIMARY <<<"$(on "$SERVER" 'cat /sys/devices/system/cpu/cpu[0-9]*/topology/thread_siblings_list 2>/dev/null' | sort -u | awk -F'[,-]' '{print $1}' | sort -n | tr '\n' ' ')"
read -r -a SIBLINGS <<<"$(on "$SERVER" 'cat /sys/devices/system/cpu/cpu[0-9]*/topology/thread_siblings_list 2>/dev/null' | sort -u | awk -F'[,-]' 'NF>1{print $2}' | sort -n | tr '\n' ' ')"
GEN_CPUS=$(on "$GEN" "$DG info --format '{{.NCPU}}'")
SERVER_IP=$([ "$SAME" = 1 ] && echo "" || on "$SERVER" "hostname -I | awk '{print \$1}'")
log "server: ${#PRIMARY[@]} cores (pinning: $PIN), generator: $GEN_CPUS CPUs, results: $OUT"
cpu_opt() { # cpu_opt <first core index> <count>: pinned cores, or a quota on a local dry run
	if [ "$PIN" = 1 ]; then local s=("${PRIMARY[@]:$1:$2}"); echo "--cpuset-cpus $(IFS=,; echo "${s[*]}")"; else echo "--cpus $2"; fi
}
aux_opt() { # redis, maps, map-storage: on the last core's sibling, away from the measured cores
	if [ "$PIN" = 1 ]; then echo "--cpuset-cpus ${SIBLINGS[-1]:-${PRIMARY[-1]}}"; else echo ""; fi
}
addr() { # addr <container> <port>: how the generator reaches a server port
	if [ "$SAME" = 1 ]; then echo "http://$1:$2"; else echo "http://$SERVER_IP:$2"; fi
}
publish() { [ "$SAME" = 1 ] || echo "-p $1:$1"; }
GEN_NET=$([ "$SAME" = 1 ] && echo "--network wa-bench" || echo "--network host")

stop_servers() { on "$SERVER" "ids=\$($DS ps -aq --filter name=^wa-bench-srv); [ -z \"\$ids\" ] || $DS rm -f \$ids >/dev/null"; }
COMMON_ENV="-e SECRET_KEY=bench -e CLIENT_DISCONNECTION_RETENTION_MS=30000"
TS_ENV="$COMMON_ENV -e NODE_ENV=production -e PUSHER_URL=http://bench -e PLAY_URL=http://bench -e FRONT_URL=http://bench \
 -e ICON_URL=http://icon -e UPLOADER_URL=http://uploader -e MAP_STORAGE_API_TOKEN=bench -e MAP_STORAGE_URL=wa-bench-srv-ms:50053 \
 -e INTERNAL_MAP_STORAGE_URL=http://wa-bench-srv-ms:3000 -e PUBLIC_MAP_STORAGE_URL=http://bench-ms -e REDIS_HOST=wa-bench-srv-redis \
 -e STORE_VARIABLES_FOR_LOCAL_MAPS=true -e MINIMUM_DISTANCE=64 -e GROUP_RADIUS=48 -e MAX_PER_GROUP=100 -e PLAYER_VARIABLES_MAX_TTL=-1 \
 -e ENABLE_BASIC_AUTHENTICATION=true -e AUTHENTICATION_USER=bench -e AUTHENTICATION_PASSWORD=bench -e STORAGE_DIRECTORY=/maps -e PATH_PREFIX="

# start <server> <cpus>: go|rust on N cores, or ts with N cores of Node processes (1 + 1, 3 + 1, 6 + 2).
# Sets HTTP and WS_URLS (comma-separated lists) and SRV (the containers that count as the server).
start() {
	local kind=$1 n=$2
	stop_servers
	case $kind in
	go)
		on "$SERVER" "$DS run -d --name wa-bench-srv-go --network wa-bench $(cpu_opt 0 "$n") -m 6g $(publish 3000) -v \$(cd $WS && pwd)/bin:/app:ro $COMMON_ENV busybox:1.37 /app/wa-server-go >/dev/null"
		HTTP=$(addr wa-bench-srv-go 3000); WS_URLS=$HTTP; SRV=wa-bench-srv-go ;;
	rust)
		on "$SERVER" "$DS run -d --name wa-bench-srv-rust --network wa-bench $(cpu_opt 0 "$n") -m 6g $(publish 3000) $COMMON_ENV -e RUST_LOG=warn wa-bench-rust >/dev/null"
		HTTP=$(addr wa-bench-srv-rust 3000); WS_URLS=$HTTP; SRV=wa-bench-srv-rust ;;
	ts)
		local pushers backs i list="" core=0
		case $n in 2) pushers=1 backs=1 ;; 4) pushers=3 backs=1 ;; 8) pushers=6 backs=2 ;; *) log "no TS layout for $n CPUs"; return 1 ;; esac
		for i in $(seq "$backs"); do list+="${list:+,}wa-bench-srv-back-$i:50051"; done
		on "$SERVER" "$DS run -d --name wa-bench-srv-redis --network wa-bench $(aux_opt) redis:6 >/dev/null
			$DS run -d --name wa-bench-srv-maps --network wa-bench $(aux_opt) ghcr.io/workadventure/maps:$WA_TAG >/dev/null
			$DS run -d --name wa-bench-srv-ms --network wa-bench $(aux_opt) --user root -e API_URL=wa-bench-srv-back-1:50051 $TS_ENV ghcr.io/workadventure/map-storage:$WA_TAG >/dev/null"
		HTTP="" WS_URLS="" SRV=""
		for i in $(seq "$backs"); do
			on "$SERVER" "$DS run -d --name wa-bench-srv-back-$i --network wa-bench $(cpu_opt $core 1) -m 6g -e API_URL=$list $TS_ENV ghcr.io/workadventure/back:$WA_TAG >/dev/null"
			core=$((core + 1)); SRV+=" wa-bench-srv-back-$i"
		done
		for i in $(seq "$pushers"); do
			local hp=$((3000 + 2 * i)) wp=$((3001 + 2 * i))
			on "$SERVER" "$DS run -d --name wa-bench-srv-play-$i --network wa-bench $(cpu_opt $core 1) -m 6g $(publish $hp) $(publish $wp) -e PUSHER_HTTP_PORT=$hp -e PUSHER_WS_PORT=$wp -e API_URL=$list $TS_ENV ghcr.io/workadventure/play:$WA_TAG >/dev/null"
			core=$((core + 1)); SRV+=" wa-bench-srv-play-$i"
			HTTP+="${HTTP:+,}$(addr wa-bench-srv-play-$i $hp)"; WS_URLS+="${WS_URLS:+,}$(addr wa-bench-srv-play-$i $wp)"
		done ;;
	esac
	local url
	for url in ${HTTP//,/ }; do
		on "$GEN" "for i in \$(seq 120); do $DG run --rm $GEN_NET busybox:1.37 wget -qO- $url/ping >/dev/null 2>&1 && exit 0; sleep 1; done; exit 1" ||
			{ log "$kind did not answer /ping on $url"; return 1; }
	done
}

# measure <scenario> <server> <cpus> <generator> <pass> <generator args...>: one run, one JSON line in results.jsonl.
measure() {
	local scenario=$1 kind=$2 n=$3 gen=$4 pass=$5; shift 5
	local window=${WINDOW:-$DURATION}
	[ "$scenario" = storm ] && window=$((DURATION + 50))
	# CPU and memory, sampled on both machines during the measurement window only (peak memory over all of it).
	on "$SERVER" "sleep $WARMUP; end=\$((\$(date +%s) + $window)); while [ \$(date +%s) -lt \$end ]; do $DS stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' $SRV | awk -v t=\$(date +%s) '{print t, \$0}'; done" >"$OUT/stats-server.tmp" 2>/dev/null &
	local s1=$!
	on "$GEN" "sleep $WARMUP; end=\$((\$(date +%s) + $window)); while [ \$(date +%s) -lt \$end ]; do $DG stats --no-stream --format '{{.CPUPerc}}' wa-bench-gen 2>/dev/null; done" >"$OUT/stats-gen.tmp" 2>/dev/null &
	local s2=$! result status=0
	# The TS pusher checks the front's apiVersionHash; the candidates, built here without a front, accept "dev".
	local ver=${CAND_VERSION:-dev}
	[ "$kind" != ts ] || ver=$FRONT_HASH
	if [ "$gen" = loadbot ]; then
		result=$(on "$GEN" "$DG run --rm --name wa-bench-gen $GEN_NET --ulimit nofile=65536:65536 -v \$(cd $WG && pwd)/bin:/app:ro busybox:1.37 /app/loadbot \
			-http $HTTP -ws $WS_URLS -version $ver -warmup ${WARMUP}s -duration ${window}s $*" 2>"$OUT/gen-stderr.tmp" | tail -1) || status=$?
	else
		result=$(on "$GEN" "$DG run --rm --name wa-bench-gen $GEN_NET --ulimit nofile=65536:65536 -e WA_LOAD_VERSION=$ver -e WA_LOAD_WS=$WS_URLS wa-bench-rust \
			wa-load --server $HTTP --duration $window $*" 2>"$OUT/gen-stderr.tmp" | tail -1) || status=$?
	fi
	wait $s1 $s2 || true
	if [ -z "$result" ] || [ "${result:0:1}" != "{" ]; then result=null; tail -3 "$OUT/gen-stderr.tmp" >>"$OUT/run.log"; fi
	python3 "$HERE/summarize.py" record "$OUT/results.jsonl" "$OUT/stats-server.tmp" "$OUT/stats-gen.tmp" "$GEN_CPUS" \
		"{\"scenario\":\"$scenario\",\"server\":\"$kind\",\"cpus\":$n,\"generator\":\"$gen\",\"pass\":$pass,\"exit\":$status,\"args\":\"$*\",\"result\":$result}"
}
held() { python3 "$HERE/summarize.py" held "$OUT/results.jsonl"; } # the last run held: p99 <= 250 ms, nobody lost, valid

# Load levels. A room of 10 walkers at 5 moves/s = 50 moves/s (+ 10 % of turns).
if [ "$QUICK" = 1 ]; then
	CORES_C="1"; CORES_TS="2"; FIX="-rooms 4 -users 5"; FIXW="--rooms 4 --users 5"; STEP=2; KMAX=2; BIG="30"
	REAL="-rooms 4 -users 10 -burst 1s,2s -pause 1s,3s"; STORM="-rooms 2 -users 10"; STORM_AT=3
else
	CORES_C="1 2 4 8"; CORES_TS="2 4 8"; FIX="-rooms 100 -users 10"; FIXW="--rooms 100 --users 10"; STEP=100; KMAX=20; BIG="300 500 1000"
	REAL="-rooms 100 -users 20"; STORM="-rooms 100 -users 20"; STORM_AT=20
fi
SERVERS=${SERVERS:-go rust ts} # e.g. SERVERS=ts to measure the reference alone
configs() {
	local k n
	for k in go rust; do [[ " $SERVERS " == *" $k "* ]] && for n in $CORES_C; do echo "$k $n"; done; done
	[[ " $SERVERS " != *" ts "* ]] || for n in $CORES_TS; do echo "ts $n"; done
}
fits() { [ "$PIN" = 0 ] || [ "$1" = ts ] || [ "$2" -le "${#PRIMARY[@]}" ]; } # a level needs that many cores
wa_load_ok() { [ "$1" != ts ] || [ "$2" = 2 ]; } # wa-load has one server URL: TS with a single pusher only
TS_MAP="-room-base http://bench -map wa-bench-srv-maps/tests/E2E/empty.json?room=%d"
wl_map() { [ "$1" != ts ] || echo "--room-url http://bench/_/global/wa-bench-srv-maps/tests/E2E/empty.json?room={r}"; }
map_args() { [ "$1" != ts ] || echo "$TS_MAP"; }
picked() { [ "$QUICK" = 1 ] || case "$1 $2" in "go 1" | "go 4" | "rust 1" | "rust 4" | "ts 2" | "ts 4") true ;; *) false ;; esac; }

for scenario in $SCENARIOS; do
	log "== $scenario"
	case $scenario in
	fixed) # same load everywhere: CPU, memory and latency at equal work
		while read -r kind n; do
			fits "$kind" "$n" || continue
			start "$kind" "$n" || continue
			for p in $(seq $PASSES); do
				measure fixed "$kind" "$n" loadbot "$p" $FIX $(map_args "$kind")
				if wa_load_ok "$kind" "$n"; then measure fixed "$kind" "$n" wa-load "$p" $FIXW $(wl_map "$kind"); fi
			done
		done < <(configs) ;;
	capacity) # +STEP rooms per step until p99 > 250 ms or someone is lost; then more passes on both sides of the edge
		while read -r kind n; do
			fits "$kind" "$n" || continue
			start "$kind" "$n" || continue
			k=1 last=0
			while [ $k -le $KMAX ]; do
				WINDOW=$RAMP measure capacity "$kind" "$n" loadbot 1 -rooms $((k * STEP)) -users 10 $(map_args "$kind")
				held || break
				last=$k; k=$((k + 1))
			done
			for edge in $last $k; do
				[ "$edge" -ge 1 ] && [ "$edge" -le $KMAX ] || continue
				for p in $(seq 2 $PASSES); do measure capacity "$kind" "$n" loadbot "$p" -rooms $((edge * STEP)) -users 10 $(map_args "$kind"); done
			done
			if [ "$last" -ge 1 ] && wa_load_ok "$kind" "$n"; then
				for p in $(seq $PASSES); do measure capacity "$kind" "$n" wa-load "$p" --rooms $((last * STEP)) --users 10 $(wl_map "$kind"); done
			fi
		done < <(configs) ;;
	bigroom) # one room of 300, 500, 1 000 players: everybody sees everybody
		while read -r kind n; do
			picked "$kind" "$n" && fits "$kind" "$n" || continue
			for size in $BIG; do
				start "$kind" "$n" || continue
				for p in $(seq $PASSES); do measure bigroom "$kind" "$n" loadbot "$p" -rooms 1 -users "$size" -side 600 $(map_args "$kind"); done
			done
		done < <(configs) ;;
	realistic) # 90 % idle, the others walk in bursts
		while read -r kind n; do
			picked "$kind" "$n" && fits "$kind" "$n" || continue
			start "$kind" "$n" || continue
			for p in $(seq $PASSES); do measure realistic "$kind" "$n" loadbot "$p" $REAL -profile realistic $(map_args "$kind"); done
		done < <(configs) ;;
	storm) # cut every connection, come back after 5 s (resume) or 35 s (beyond the 30 s retention)
		while read -r kind n; do
			{ [ "$QUICK" = 1 ] || case "$kind $n" in "go 4" | "rust 4" | "ts 4") true ;; *) false ;; esac; } && fits "$kind" "$n" || continue
			for down in 5 35; do
				for p in $(seq $PASSES); do
					start "$kind" "$n" || continue # a fresh server each time: the peak memory is the storm's
					measure storm "$kind" "$n" loadbot "$p" $STORM -side 600 -storm-at ${STORM_AT}s -storm-down ${down}s $(map_args "$kind")
				done
			done
		done < <(configs) ;;
	*) log "unknown scenario $scenario" ;;
	esac
done
stop_servers
for f in stats-server stats-gen gen-stderr; do rm -f "${OUT:?}/$f.tmp"; done
python3 "$HERE/summarize.py" summary "$OUT/results.jsonl" >"$OUT/summary.md"
log "done: $OUT/summary.md"
