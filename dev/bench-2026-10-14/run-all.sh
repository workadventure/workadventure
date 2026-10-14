#!/usr/bin/env bash
# One session, one generator (Go loadbot, 10 bots/room, 10 moves/s unless said), three servers.
SP=$(cd "$(dirname "$0")" && pwd); OUT=$SP/results.jsonl
r() { echo "$("$@" 2>&1 | tail -1)" | tee -a "$OUT"; }
# 1. Same load (50 rooms x 10 = 5 000 moves/s): TS (1 pusher + 1 back, no CPU limit), candidates at 1/2/4 CPU.
r $SP/ts-load.sh 50 10
for c in 1 2 4; do r $SP/cand-load.sh go $c 50 10; r $SP/cand-load.sh rust $c 50 10; done
# 2. Capacity ladder (10 000 to 40 000 moves/s).
for n in 100 200; do r $SP/ts-load.sh $n 10; done
for n in 100 200 300 400; do for c in 1 4; do r $SP/cand-load.sh go $c $n 10; r $SP/cand-load.sh rust $c $n 10; done; done
# 3. One big room: 300 bots at 5 moves/s.
r $SP/ts-load.sh 1 300 5
r $SP/cand-load.sh go 1 1 300 5; r $SP/cand-load.sh rust 1 1 300 5
echo DONE | tee -a "$OUT"
