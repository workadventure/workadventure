#!/usr/bin/env python3
"""Results of dev/bench/run-remote.sh.

  summarize.py record <results.jsonl> <server stats> <generator stats> <generator CPUs> <run JSON>
      adds one run: the generator's output (loadbot or wa-load) put in common fields, CPU and memory from the
      `docker stats` samples, and whether the run is valid and held.
  summarize.py held <results.jsonl>      exit 0 if the last run held (p99 <= 250 ms, nobody lost, valid)
  summarize.py summary <results.jsonl>   Markdown tables on stdout, one CSV per scenario next to the results
"""
import csv
import json
import os
import statistics
import sys
from collections import defaultdict

P99_LIMIT_MS = 250
GEN_CPU_LIMIT = 0.70  # beyond, the generator is what gets measured


def mib(token):
    for unit, factor in (("GiB", 1024), ("MiB", 1), ("KiB", 1 / 1024), ("kB", 1 / 1024), ("B", 1 / 1024 / 1024)):
        if token.endswith(unit):
            return float(token[: -len(unit)]) * factor
    return 0.0


def server_stats(path):
    """Average CPU (%, all server containers summed) and peak memory (MiB, summed) over the samples."""
    cpu, mem = defaultdict(float), defaultdict(float)
    for line in open(path):
        parts = line.split()
        if len(parts) < 4 or not parts[2].endswith("%"):
            continue
        cpu[parts[0]] += float(parts[2].rstrip("%"))
        mem[parts[0]] += mib(parts[3])
    if not cpu:
        return None, None
    return round(statistics.mean(cpu.values()), 1), round(max(mem.values()), 1)


def gen_share(path, cpus):
    samples = [float(l.strip().rstrip("%")) for l in open(path) if l.strip().endswith("%")]
    return round(statistics.mean(samples) / (100 * cpus), 3) if samples else None


def common(run):
    r = run["result"]
    if r is None:
        return {}
    if run["generator"] == "loadbot":
        lost = r["bots"] - r["joined"] + r["errors"]
        out = {"bots": r["bots"], "moves_per_s": r["moves_per_s"], "delivered_per_s": r["submessages_per_s"],
               "p50_ms": r["latency_ms_p50"], "p99_ms": r["latency_ms_p99"], "lost": lost,
               "fresh_p99_ms": r.get("freshness_ms_p99")}
        for k in ("storm_resumed", "storm_refused", "storm_rejoined", "storm_lost", "storm_return_ms_p99"):
            if k in r:
                out[k] = r[k]
        return out
    return {"bots": r["rooms"] * r["users_per_room"], "moves_per_s": r["moves_sent_per_s"],
            "delivered_per_s": r["subs_received_per_s"], "p50_ms": r["latency_ms"]["p50"],
            "p99_ms": r["latency_ms"]["p99"], "lost": 0 if run["exit"] == 0 else None}


def record(results, server_path, gen_path, gen_cpus, run_json):
    run = json.loads(run_json)
    run.update(common(run))
    run["server_cpu_pct"], run["server_mem_mib"] = server_stats(server_path)
    run["gen_cpu_share"] = gen_share(gen_path, int(gen_cpus))
    run["valid"] = run["result"] is not None and run["exit"] == 0 and (run["gen_cpu_share"] or 0) <= GEN_CPU_LIMIT
    run["held"] = run["valid"] and run["lost"] == 0 and run["p99_ms"] <= P99_LIMIT_MS
    with open(results, "a") as f:
        f.write(json.dumps(run) + "\n")
    print(f"{run['scenario']} {run['server']}@{run['cpus']} {run['generator']} pass {run['pass']}: "
          f"p99 {run.get('p99_ms')} ms, {run.get('moves_per_s', 0):.0f} moves/s, cpu {run['server_cpu_pct']} %, "
          f"mem {run['server_mem_mib']} MiB, {'held' if run['held'] else 'NOT held'}"
          + ("" if run["valid"] else " (invalid run)"), file=sys.stderr)


def load(results):
    return [json.loads(l) for l in open(results) if l.strip()]


def med(values):
    values = [v for v in values if v is not None]
    if not values:
        return "–"
    m, lo, hi = statistics.median(values), min(values), max(values)
    fmt = (lambda v: f"{v:.0f}") if max(abs(v) for v in values) >= 10 else (lambda v: f"{v:.2f}")
    return fmt(m) if lo == hi else f"{fmt(m)} ({fmt(lo)}–{fmt(hi)})"


def table(rows, keys, columns):
    groups = defaultdict(list)
    for r in rows:
        groups[tuple(r.get(k) for k in keys)].append(r)
    lines = ["| " + " | ".join(keys + [c for c, _ in columns]) + " |", "|" + "---|" * (len(keys) + len(columns))]
    for key in sorted(groups, key=lambda k: tuple(str(x) for x in k)):
        runs = groups[key]
        lines.append("| " + " | ".join([str(k) for k in key] + [f(runs) for _, f in columns]) + " |")
    return "\n".join(lines)


def summary(results):
    rows = load(results)
    folder = os.path.dirname(results)
    for scenario in sorted({r["scenario"] for r in rows}):
        runs = [r for r in rows if r["scenario"] == scenario]
        fields = sorted({k for r in runs for k in r if k not in ("result", "args")})
        with open(os.path.join(folder, f"{scenario}.csv"), "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields + ["args"], extrasaction="ignore")
            w.writeheader()
            w.writerows(runs)
    col = lambda name: (lambda runs: med([r.get(name) for r in runs]))
    held = lambda runs: f"{sum(r['held'] for r in runs)}/{len(runs)}"
    print("# Common bench\n")
    print(f"Held = p99 <= {P99_LIMIT_MS} ms, nobody lost, generator under {GEN_CPU_LIMIT:.0%} of its CPUs. "
          "Values: median (min–max) over the passes.\n")
    base = [("bots", col("bots")), ("moves/s", col("moves_per_s")), ("delivered/s", col("delivered_per_s")),
            ("p50 ms", col("p50_ms")), ("p99 ms", col("p99_ms")), ("freshness p99 ms", col("fresh_p99_ms")),
            ("server CPU %", col("server_cpu_pct")), ("server MiB", col("server_mem_mib")), ("held", held)]
    for scenario in ("fixed", "capacity", "bigroom", "realistic", "storm"):
        runs = [r for r in rows if r["scenario"] == scenario]
        if not runs:
            continue
        print(f"\n## {scenario}\n")
        if scenario == "capacity":
            best = defaultdict(lambda: 0)
            for r in runs:
                k = (r["server"], r["cpus"], r["generator"])
                if r["held"]:
                    best[k] = max(best[k], round(r["moves_per_s"]))
            print("Highest load held (moves/s), per server, CPUs and generator:\n")
            print("| server | CPUs | generator | moves/s held |\n|---|---|---|---|")
            for k in sorted({(r["server"], r["cpus"], r["generator"]) for r in runs}):
                print(f"| {k[0]} | {k[1]} | {k[2]} | {best[k] or '< first step'} |")
            print()
            runs = [dict(r, load=r["args"].split()[1] + " rooms") for r in runs]
            print(table(runs, ["server", "cpus", "generator", "load"], base))
        elif scenario == "storm":
            runs = [dict(r, down=r["args"].split("-storm-down ")[1].split()[0]) for r in runs]
            print(table(runs, ["server", "cpus", "down"], [
                ("bots", col("bots")), ("resumed", col("storm_resumed")), ("refused", col("storm_refused")),
                ("lost", col("storm_lost")), ("return p99 ms", col("storm_return_ms_p99")),
                ("peak MiB", col("server_mem_mib")), ("server CPU %", col("server_cpu_pct"))]))
        else:
            keys = ["server", "cpus", "generator"] + (["bots"] if scenario == "bigroom" else [])
            print(table(runs, keys, [c for c in base if not (scenario == "bigroom" and c[0] == "bots")]))


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "record":
        record(*sys.argv[2:7])
    elif mode == "held":
        rows = load(sys.argv[2])
        sys.exit(0 if rows and rows[-1]["held"] else 1)
    elif mode == "summary":
        summary(sys.argv[2])
