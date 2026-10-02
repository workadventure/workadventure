#!/usr/bin/env node
/**
 * Regenerate the PWTEST_SHARD_WEIGHTS values in .github/workflows/build-test-and-deploy.yml.
 *
 * Playwright's `--shard` balances by test COUNT. Our tests are wildly uneven (a 0.7s error-page
 * check and a 60s matrix-chat test both count as "1"), so a count-balanced split left the chromium
 * shards 3.5x apart in wall time and the slowest one alone defined the whole pipeline's duration.
 *
 * `PWTEST_SHARD_WEIGHTS` ("a:b:c") sets each shard's test count explicitly. Shards are still
 * contiguous runs of whole spec files in listing order, so choosing the counts places the
 * boundaries — and the boundaries can be placed to balance DURATION instead of count.
 *
 * Usage:
 *   node scripts/shard-weights.mjs [runId]      # default: latest build-test-and-deploy run
 *
 * Needs `gh` authenticated, and the Room API client built, or `--list` cannot import room-api.spec:
 *   (cd ../libs/room-api-clients/room-api-client-js && npm ci && npm run ts-proto)
 */
import { execFileSync } from "node:child_process";

/** project -> [shards, grep-invert] — must match the workflow matrix. */
const PROJECTS = {
    chromium: [5, "@slow|@nodesktop"],
    firefox: [4, "@slow|@nofirefox|@nodesktop"],
    mobilechromium: [2, "@slow|@nomobile"],
};

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });

/** Per-project, per-file test time (seconds) from a finished CI run's logs. */
function durations(runId) {
    const jobs = JSON.parse(sh("gh", ["run", "view", runId, "--json", "jobs"])).jobs.filter((j) =>
        j.name.startsWith("End to end tests with"),
    );
    const out = new Map();
    // The list reporter prints: [project] › path/to/file.spec.ts:12:5 › title (1.2s)
    // Units scale with the value: 900ms, 12.3s, 2.0m. Missing "m" silently zeroes the SLOWEST
    // tests, which is precisely backwards for balancing — keep all three.
    const line = /\[(\w+)\] › (\S+\.spec\.ts):\d+:\d+ › .*?\((\d+(?:\.\d+)?)(ms|s|m)\)/g;
    const scale = { ms: 1 / 1000, s: 1, m: 60 };
    for (const job of jobs) {
        const log = sh("gh", ["run", "view", "--job", String(job.databaseId), "--log"]);
        for (const [, project, file, n, unit] of log.matchAll(line)) {
            // The reporter prints paths from the repo root ("tests/x.spec.ts"); --list prints them
            // relative to testDir ("x.spec.ts"). Normalise or every lookup silently misses.
            const key = `${project}\t${file.replace(/^tests\//, "")}`;
            out.set(key, (out.get(key) ?? 0) + Number(n) * scale[unit]);
        }
    }
    if (!out.size) throw new Error(`No test durations found in run ${runId} — did the e2e jobs run?`);
    return out;
}

/** Spec files in Playwright's shard order, with how many tests each contributes. */
function listGroups(project, ignore) {
    const log = sh("npm", [
        "run", "test-prod-like", "--silent", "--",
        `--project=${project}`, "--grep-invert", ignore, "--list",
    ]);
    const groups = [];
    for (const [, file] of log.matchAll(new RegExp(`\\[${project}\\] › (\\S+\\.spec\\.ts):`, "g"))) {
        if (groups.at(-1)?.file !== file) groups.push({ file, tests: 0 });
        groups.at(-1).tests++;
    }
    return groups;
}

/** Split `groups` into `n` contiguous blocks minimising the slowest block (binary search on the cap). */
function partition(groups, n) {
    const fill = (cap) => {
        const blocks = [[]];
        let acc = 0;
        for (const g of groups) {
            if (acc + g.seconds > cap && blocks.at(-1).length) (blocks.push([]), (acc = 0));
            blocks.at(-1).push(g);
            acc += g.seconds;
        }
        return blocks;
    };
    let lo = Math.max(...groups.map((g) => g.seconds));
    let hi = groups.reduce((a, g) => a + g.seconds, 0);
    while (hi - lo > 0.001) {
        const mid = (lo + hi) / 2;
        if (fill(mid).length <= n) hi = mid;
        else lo = mid;
    }
    const blocks = fill(hi);
    while (blocks.length < n) blocks.push([]); // a project with fewer files than shards
    return blocks;
}

const runId = process.argv[2] ?? String(
    JSON.parse(sh("gh", ["run", "list", "--workflow=build-test-and-deploy.yml",
        "--status=success", "--limit=1", "--json", "databaseId"]))[0].databaseId,
);
console.log(`Reading test durations from run ${runId}...\n`);
const seconds = durations(runId);

for (const [project, [shards, ignore]] of Object.entries(PROJECTS)) {
    const groups = listGroups(project, ignore).map((g) => ({
        ...g,
        seconds: seconds.get(`${project}\t${g.file}`) ?? 0,
    }));
    const missing = groups.filter((g) => !g.seconds);
    if (missing.length > groups.length / 2) {
        throw new Error(
            `${project}: no timing for ${missing.length}/${groups.length} spec files. The run's log ` +
                `paths probably no longer match --list output; weights would be meaningless.`,
        );
    }
    const blocks = partition(groups, shards);
    const weights = blocks.map((b) => b.reduce((a, g) => a + g.tests, 0));
    const times = blocks.map((b) => b.reduce((a, g) => a + g.seconds, 0));
    console.log(`${project} x${shards}`);
    console.log(`  shardWeights: "${weights.join(":")}"`);
    console.log(`  predicted: ${times.map((t) => `${t.toFixed(0)}s`).join(" ")} (max ${Math.max(...times).toFixed(0)}s)`);
    if (missing.length) console.log(`  note: no timing for ${missing.map((g) => g.file).join(", ")} — treated as 0s`);
    console.log();
}
