# Common load bench, 2026-10-14

One generator for the three servers: lang-go's `cmd/loadbot` with `loadbot-map-ws.patch` (flags `-map` and `-ws`),
against the `ts` stack, the Go candidate and the Rust candidate, on the same Mac. Results are in `results.jsonl`
(`run-all.sh`) and `results-ts-check.jsonl` (TS rerun, with and without Traefik). The analysis is in the J1 report.

```bash
dev/bench-2026-10-14/build.sh          # bin/loadbot and bin/wa-server-go (Go, Docker)
dev/bench-2026-10-14/run-all.sh        # the sequence of 2026-10-14, ~35 min
```

- `ts-load.sh <rooms> <users> [rate]`: the `ts` stack through Traefik. Needs `dev/dev socle up` + `dev/dev stack up ts`
  on `SOCLE_HTTP_PORT=8880`, with the front of `WA_TAG` (`-version b82fc568`).
- `ts-direct.sh`: the same, straight to the pusher (HTTP on 3000, WebSocket on 3001).
- `cand-load.sh <go|rust> <cpus> <rooms> <users> [rate]`: a candidate limited to N CPUs and 1 GB, on a private network
  (`docker network create wa-dsc-bench` first). Rust uses the image `wa-server-rust:prod`, built from lang-rust (see
  `server-rust/bench/cpus.sh`).

Why the patch: both generators send `version=dev` and a fake map URL, which the candidates accept and the TS does
not. The TS needs the front's `apiVersionHash` and a map its back can fetch
(`maps.workadventure.localhost:8880/tests/E2E/empty.json?room=%d`, one room per query string).

Limits: one run per point on a shared Mac (host load 8 to 13), bots moving non-stop; Rust delivers 10 to 40% fewer
position messages (its queue replaces a pending position by the next one), which favours its capacity.
