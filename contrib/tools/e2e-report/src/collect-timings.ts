#!/usr/bin/env node
/**
 * Regenerates `tests/shard-timings.json` from the end-to-end jobs of a GitHub Actions run.
 *
 * `tests/scripts/shard-list.mjs` packs spec files into shards by those durations, so the file only
 * needs to be refreshed when the suite has drifted enough that shard-list starts warning about
 * unrecorded spec files, or when a shard visibly outgrows its neighbours.
 *
 * Prefer a run where every leg finished: a cancelled or early-aborted leg reports fewer tests than
 * it really owns, which would understate the weight of the files it never reached.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { getJobCoordinates } from "./artifacts.js";
import {
  fetchJobLog,
  getRepository,
  getWorkflowRun,
  listJobs,
  listWorkflowRuns,
  run,
  type WorkflowJob,
} from "./github.js";
import { buildTimings, parseJobLog, type TestEntry } from "./timings.js";

/** Only the browser matrix: the helm and single-domain legs run a different, filtered subset. */
const browserProjects = [
  "chromium",
  "firefox",
  "webkit",
  "mobilechromium",
  "mobilefirefox",
  "mobilewebkit",
];

const help = `Regenerate tests/shard-timings.json from an end-to-end workflow run.

Usage:
  npm run e2e:timings
  npm run e2e:timings -- --run 31467905058

Options:
  --run <id>       Workflow run to read (default: the newest successful run on master)
  --branch <name>  Branch to pick the default run from (default: master)
  --dry-run        Print the summary without writing the file
  -h, --help       Show this help
`;

interface Options {
  runId?: number;
  branch: string;
  dryRun: boolean;
  help: boolean;
}

function parseOptions(argv: string[]): Options {
  const options: Options = { branch: "master", dryRun: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = (): string => {
      index += 1;
      const value = argv[index];
      if (value === undefined) {
        throw new Error(`Missing value for ${argument}`);
      }
      return value;
    };

    switch (argument) {
      case "--run":
        options.runId = Number.parseInt(next(), 10);
        break;
      case "--branch":
        options.branch = next();
        break;
      case "--dry-run":
        options.dryRun = true;
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

async function selectRunId(options: Options): Promise<number> {
  if (options.runId !== undefined) {
    return options.runId;
  }

  const runs = await listWorkflowRuns(
    options.branch,
    "build-test-and-deploy.yml",
  );
  const successful = runs.find(
    (candidate) => candidate.conclusion === "success",
  );
  if (successful === undefined) {
    throw new Error(
      `No successful build-test-and-deploy.yml run on ${options.branch}. Pass --run <id>.`,
    );
  }
  return successful.databaseId;
}

function endToEndJobs(jobs: WorkflowJob[]): WorkflowJob[] {
  return jobs.filter((job) => {
    const coordinates = getJobCoordinates(job.name);
    return (
      coordinates !== undefined && browserProjects.includes(coordinates.project)
    );
  });
}

/**
 * The spec files as they existed at the commit the run tested, in the form `--test-list` wants:
 * relative to testDir, POSIX separators.
 *
 * Reading the working tree instead would record every spec file added since that commit at zero,
 * and `shard-list.mjs` reads zero as "this project filters all of its tests out" — so a brand new
 * spec would be packed as free and pile up in one shard. Files the run did not know about are
 * better left out entirely, which makes shard-list weigh them as an average file.
 */
async function listSpecFilesAtCommit(headSha: string): Promise<string[]> {
  const output = await run(
    "git",
    ["ls-tree", "-r", "--name-only", headSha, "--", "tests/tests"],
    { allowFailure: true },
  );
  if (output === "") {
    throw new Error(
      `Commit ${headSha} is not available locally. Fetch it (\`git fetch origin ${headSha}\`) ` +
        `so the spec files of that run can be listed.`,
    );
  }

  return output
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.endsWith(".spec.ts"))
    .map((entry) => entry.slice("tests/tests/".length))
    .sort();
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    console.log(help);
    return;
  }

  const repositoryRoot = await run("git", ["rev-parse", "--show-toplevel"]);
  const repository = await getRepository();
  const runId = await selectRunId(options);
  const workflowRun = await getWorkflowRun(runId);
  const jobs = endToEndJobs(await listJobs(runId));

  if (jobs.length === 0) {
    throw new Error(`Run ${runId} has no end-to-end browser jobs.`);
  }

  console.log(
    `Reading ${jobs.length} end-to-end jobs from ${workflowRun.url} (${workflowRun.conclusion})`,
  );

  const entries: TestEntry[] = [];
  const empty: string[] = [];
  for (const job of jobs) {
    const log = await fetchJobLog(repository, job.databaseId);
    const parsed = parseJobLog(log);
    if (parsed.length === 0) {
      empty.push(job.name);
    }
    entries.push(...parsed);
    console.log(`  ${job.name}: ${parsed.length} test results`);
  }

  if (empty.length > 0) {
    console.warn(
      `Warning: no test results in ${empty.length} job(s): ${empty.join(", ")}. ` +
        `Their spec files will be recorded at zero and treated as free.`,
    );
  }

  const specFiles = await listSpecFilesAtCommit(workflowRun.headSha);
  const timings = buildTimings(entries, specFiles, browserProjects);

  for (const project of browserProjects) {
    const perFile = timings[project] ?? {};
    const total = Object.values(perFile).reduce((sum, value) => sum + value, 0);
    const measured = Object.values(perFile).filter((value) => value > 0).length;
    console.log(
      `${project.padEnd(16)} ${(total / 60).toFixed(1)} min over ${measured} spec files`,
    );
  }

  const output = {
    comment:
      "Per-project, per-spec-file durations in seconds, used by tests/scripts/shard-list.mjs to " +
      "balance the end-to-end shards. Regenerate with `npm run e2e:timings`.",
    source: {
      run: runId,
      url: workflowRun.url,
      createdAt: workflowRun.createdAt,
    },
    projects: timings,
  };

  if (options.dryRun) {
    console.log("Dry run: tests/shard-timings.json left untouched.");
    return;
  }

  const destination = join(repositoryRoot, "tests", "shard-timings.json");
  writeFileSync(destination, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${destination}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
