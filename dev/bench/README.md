# Common bench: TS, Go and Rust under the same load

The same generators against the three servers, the server on one machine and the generator on another. It runs at
the end of each milestone, from J2 on (decided on 2026-10-14; rules in the plan's "Règles communes" section).

```bash
dev/bench/run-remote.sh ubuntu@<server> ubuntu@<generator>             # everything, ~6 to 8 h
dev/bench/run-remote.sh ubuntu@<server> ubuntu@<generator> fixed storm # some scenarios only
QUICK=1 dev/bench/run-remote.sh local local                            # dry run on this machine, ~30 min
```

Results land in `results/<date>-aws/`: `results.jsonl` (one line per run), one CSV per scenario, `summary.md` and
`run.log`. A local dry run goes to `results/*-local/`, ignored by git: its figures are not comparable.

## The two machines (AWS, on our side)

- 2 × `c7i.4xlarge` (x86, 16 vCPU = 8 physical cores, 32 GB), Ubuntu 24.04 LTS, 30 GB of disk.
- Same availability zone, in a `cluster` placement group.
- One SSH key for both. Security group: all traffic between the two instances, SSH (22) from your IP only.
- Nothing to install: the script installs `docker.io` and `docker-buildx` when they are missing. It ships the code
  with `git archive`, so the branches do not need to be pushed.
- Destroy the instances once `summary.md` is back.

## What runs where

- **Server machine.** Every core is used by its first hyperthread only, so "4 CPUs" means 4 physical cores
  (`--cpuset-cpus`). Redis, the maps and map-storage of the TS sit on a sibling hyperthread, outside the measured
  cores.
  - Go and Rust: 1, 2, 4 and 8 cores (`GO_REF`, default `lang-go`; `RUST_REF`, default `lang-rust`).
  - TS at the same CPU budget, one core per Node process: 1 pusher + 1 back (2 cores), 3 + 1 (4), 6 + 2 (8),
    with the published images of `WA_TAG`. Rooms are spread over the backs by hash, as in production.
- **Generator machine**, its whole CPU:
  - `loadbot`: lang-go's `cmd/loadbot` + `loadbot.patch`. The patch adds several servers (bot k on the (k mod n)-th
    pusher), 5 moves/s like the front plus one at every turn, freshness, the realistic profile and the storm.
  - `wa-load`: lang-rust's generator + `wa-load.patch`. The patch adds `WA_LOAD_VERSION`, `WA_LOAD_WS` and
    `--room-url`, so that it can load the TS. It takes a single server URL, so it does not run against the TS with
    several pushers.

## Scenarios

| Scenario | Load | Servers | Generators | Passes |
|---|---|---|---|---|
| `fixed` | 100 rooms × 10 walkers (≈ 5 500 moves/s) | all levels | both | 3 |
| `capacity` | +100 rooms per step until p99 > 250 ms or a bot is lost | all levels | `loadbot` ramp, `wa-load` at the edge | ramp 1 (30 s), edge 3 |
| `bigroom` | 1 room of 300, 500 then 1 000 walkers | Go/Rust 1 and 4, TS 2 and 4 | `loadbot` | 3 |
| `realistic` | 100 rooms × 20, 90 % idle, the others walk 3–10 s every 30–60 s | Go/Rust 1 and 4, TS 2 and 4 | `loadbot` | 3 |
| `storm` | 100 rooms × 20; every connection cut 20 s in, back after 5 s (resume) or 35 s (beyond the 30 s retention) | Go/Rust 4, TS 4 | `loadbot` | 3 |

A run warms up for 30 s, then measures for 60 s. It **holds** if its p99 latency is at most 250 ms and no bot is
refused or lost. It is **invalid** if the generator used more than 70 % of its CPUs: the generator would then be
what gets measured.

## What is measured

- **Latency**: from a bot sending a move to another bot receiving it. It includes the 100 ms batch window.
- **Freshness** (`loadbot`): once a second, for each player a bot heard from in the last second, how much of its
  movement the bot has not seen yet. Fusing positions does not change it; a server that falls behind does.
- **Delivered messages**: positions received per second. Since the 14/10 rules, both candidates fuse positions
  within the batch window, so this figure is comparable between them, but lower than the TS's.
- **Server CPU** (average) and **memory** (peak), from `docker stats` on the server machine. For the TS, its
  pushers and backs are added up.
- **Storm**: sessions resumed, refused (then rejoined from scratch) and lost, and time to come back.

## Limits

- Bots, not people: walkers move without pause, except in `realistic`.
- The servers are reached directly, with no ingress in front of them.
- The storm closes the TCP connections without a WebSocket closing frame. It is not a silent network loss.
- The candidates are built without a front, so they accept `version=dev`. The TS pusher checks the hash of its
  front (`FRONT_HASH`, default `b82fc568` for `WA_TAG`).
