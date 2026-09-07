#!/usr/bin/env node
/**
 * Builds the list of spec files a given E2E shard should run, balanced by measured duration.
 *
 * Playwright's own `--shard` balances the *number* of tests, not their duration. On this suite the
 * two diverge badly: the four chromium shards of run 31467905058 held 63/55/56/48 tests but took
 * 22.5/13.7/11.0/6.3 minutes, so the matrix was paced by a shard doing three times the work of its
 * neighbour. This script replaces `--shard` with `--test-list`, packing whole spec files into bins
 * by their recorded duration (longest-processing-time first) so every leg finishes around the same
 * time.
 *
 * Packing is at file granularity, so the slowest single file is a floor on the shard duration.
 *
 * Every shard computes the same partition from the same inputs without talking to the others, so
 * the ordering must stay fully deterministic — hence the total sort orders below.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** Must match `testDir` in playwright.config.ts: `--test-list` paths are resolved against it. */
const specRoot = join(packageRoot, "tests");
const defaultTimingsFile = join(packageRoot, "shard-timings.json");

/** Weight given to a spec file that has no recorded duration, when nothing else is known. */
const FALLBACK_WEIGHT_SECONDS = 60;
/** Above this share of unrecorded files the packing is guesswork; tell the reader to refresh. */
const STALE_TIMINGS_RATIO = 0.2;

const usage = `Build the spec list for one duration-balanced E2E shard.

Usage:
  node scripts/shard-list.mjs --project chromium --shard 2 --of 6

Options:
  --project <name>       Playwright project the shard belongs to (required)
  --shard <number>       1-based shard number (required)
  --of <number>          Total number of shards for this project (required)
  --grep-invert <regex>  Tag filter the shard will run with; used by --verify only
  --out <file>           Write the list to a file instead of stdout
  --timings <file>       Timings file (default: shard-timings.json)
  --verify               Ask Playwright to resolve the list and fail if it selects no test
  -h, --help             Show this help
`;

function parseOptions(argv) {
    const options = { verify: false, help: false, timings: defaultTimingsFile };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        const next = () => {
            index += 1;
            const value = argv[index];
            if (value === undefined) {
                throw new Error(`Missing value for ${argument}`);
            }
            return value;
        };

        switch (argument) {
            case "--project":
                options.project = next();
                break;
            case "--shard":
                options.shard = Number.parseInt(next(), 10);
                break;
            case "--of":
                options.shardCount = Number.parseInt(next(), 10);
                break;
            case "--grep-invert":
                options.grepInvert = next();
                break;
            case "--out":
                options.out = next();
                break;
            case "--timings":
                options.timings = resolve(next());
                break;
            case "--verify":
                options.verify = true;
                break;
            case "-h":
            case "--help":
                options.help = true;
                break;
            default:
                throw new Error(`Unknown option: ${argument}`);
        }
    }
    return options;
}

/** Spec files as `--test-list` wants them: relative to testDir, POSIX separators. */
function listSpecFiles() {
    if (!existsSync(specRoot)) {
        throw new Error(`Spec directory not found: ${specRoot}`);
    }
    return readdirSync(specRoot, { recursive: true, encoding: "utf8" })
        .map((entry) => entry.split("\\").join("/"))
        .filter((entry) => entry.endsWith(".spec.ts"))
        .sort();
}

function readTimings(file, project) {
    if (!existsSync(file)) {
        throw new Error(`Timings file not found: ${file}. Regenerate it with \`npm run e2e:timings\`.`);
    }
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const timings = parsed.projects?.[project];
    if (timings === undefined) {
        throw new Error(
            `No timings recorded for project "${project}" in ${file}. Known projects: ${Object.keys(
                parsed.projects ?? {},
            ).join(", ")}`,
        );
    }
    return timings;
}

function median(values) {
    if (values.length === 0) {
        return FALLBACK_WEIGHT_SECONDS;
    }
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * A file absent from the timings is new since the last collection, not free: it gets the median of
 * the files that did cost something. Files recorded at 0 really are free for this project — every
 * one of their tests is filtered out by the project's tag filter — and stay at 0.
 */
function weigh(files, timings) {
    const fallback = median(Object.values(timings).filter((seconds) => seconds > 0));
    const unknown = [];
    const weighted = files.map((file) => {
        const recorded = timings[file];
        if (recorded === undefined) {
            unknown.push(file);
            return { file, weight: fallback };
        }
        return { file, weight: recorded };
    });
    return { weighted, unknown };
}

/** Longest-processing-time-first packing. Ties broken by path, then by bin index, to stay stable. */
function pack(weighted, binCount) {
    const bins = Array.from({ length: binCount }, () => ({ weight: 0, files: [] }));
    const ordered = [...weighted].sort(
        (left, right) => right.weight - left.weight || left.file.localeCompare(right.file),
    );

    for (const { file, weight } of ordered) {
        let target = bins[0];
        for (const bin of bins) {
            if (bin.weight < target.weight) {
                target = bin;
            }
        }
        target.weight += weight;
        target.files.push(file);
    }

    for (const bin of bins) {
        bin.files.sort();
    }
    return bins;
}

/**
 * Playwright answers a `--test-list` entry that matches nothing by running zero tests and exiting
 * 0, so a shard list gone stale would turn green instead of red. Resolve the list up front and
 * refuse to hand back something that selects nothing.
 */
function verify(options, listFile) {
    // Through the `list-tests` script rather than a bare `playwright`, so the listing loads the same
    // environment the tests themselves run with.
    const args = ["run", "--silent", "list-tests", "--", `--project=${options.project}`, "--test-list", listFile];
    if (options.grepInvert !== undefined) {
        args.push("--grep-invert", options.grepInvert);
    }

    const result = spawnSync("npm", args, { cwd: packageRoot, encoding: "utf8", shell: false });
    if (result.error !== undefined) {
        throw new Error(`Could not run Playwright to verify the shard list: ${result.error.message}`);
    }

    let report;
    try {
        report = JSON.parse(result.stdout);
    } catch {
        throw new Error(`Playwright did not return a JSON test list:\n${result.stdout}\n${result.stderr}`);
    }

    const errors = report.errors ?? [];
    if (errors.length > 0) {
        throw new Error(`Playwright could not load the tests:\n${errors.map((error) => error.message).join("\n")}`);
    }

    // In --list mode every test is reported as skipped, so the spec tree is the only real count.
    const countSpecs = (suites) =>
        (suites ?? []).reduce((total, suite) => total + (suite.specs?.length ?? 0) + countSpecs(suite.suites), 0);
    const selected = countSpecs(report.suites);

    if (selected === 0) {
        throw new Error(
            `The shard list selects no test. Either every test it holds is excluded by ` +
                `--grep-invert, or the paths in ${listFile} no longer match the layout of ${specRoot} — ` +
                `Playwright resolves --test-list entries against testDir and ignores the ones it ` +
                `cannot match, so a stale list runs nothing and still exits 0.`,
        );
    }
    return selected;
}

function main() {
    const options = parseOptions(process.argv.slice(2));
    if (options.help) {
        process.stdout.write(usage);
        return;
    }

    const { project, shard, shardCount } = options;
    if (project === undefined || !Number.isInteger(shard) || !Number.isInteger(shardCount)) {
        throw new Error(`--project, --shard and --of are required.\n\n${usage}`);
    }
    if (shardCount < 1 || shard < 1 || shard > shardCount) {
        throw new Error(`--shard must be between 1 and --of (got ${shard}/${shardCount})`);
    }

    const files = listSpecFiles();
    const timings = readTimings(options.timings, project);
    const { weighted, unknown } = weigh(files, timings);
    const bins = pack(weighted, shardCount);
    const bin = bins[shard - 1];

    if (bin.files.length === 0) {
        throw new Error(
            `Shard ${shard}/${shardCount} of ${project} would run nothing: ${files.length} spec files ` +
                `cannot fill ${shardCount} shards. Lower the shard count for this project.`,
        );
    }

    if (unknown.length > files.length * STALE_TIMINGS_RATIO) {
        process.stderr.write(
            `Warning: ${unknown.length}/${files.length} spec files have no recorded duration for ${project}, ` +
                `so the shards are balanced on guesses. Refresh with \`npm run e2e:timings\`.\n`,
        );
    }

    const header = [
        `# ${project} shard ${shard}/${shardCount} — ${bin.files.length} spec files, ` +
            `~${Math.round(bin.weight)}s estimated`,
        `# Generated by scripts/shard-list.mjs; paths are relative to testDir.`,
    ];
    const content = `${[...header, ...bin.files].join("\n")}\n`;

    if (options.out === undefined) {
        process.stdout.write(content);
    } else {
        writeFileSync(options.out, content);
    }

    if (options.verify) {
        if (options.out === undefined) {
            throw new Error("--verify needs --out, so Playwright has a file to resolve.");
        }
        const expected = verify(options, options.out);
        process.stderr.write(
            `Shard ${shard}/${shardCount} of ${project}: ${bin.files.length} spec files, ` +
                `${expected} tests, ~${Math.round(bin.weight)}s estimated.\n`,
        );
    }
}

try {
    main();
} catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
}
