#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import {
  buildReports,
  formatBytes,
  formatProject,
  type GithubArtifact,
  type PlaywrightReport,
} from "./artifacts.js";
import {
  getCurrentBranch,
  getCurrentPullRequest,
  getRepository,
  getWorkflowRun,
  listArtifacts,
  listJobs,
  listWorkflowRuns,
  run,
  type PullRequest,
  type WorkflowRun,
} from "./github.js";

interface Options {
  runId?: number;
  project?: string;
  shard?: number;
  workflow: string;
  refresh: boolean;
  listOnly: boolean;
  help: boolean;
}

const help = `Download and open a Playwright report from GitHub Actions.

Usage:
  npm run e2e:report
  npm run e2e:report -- --project firefox --shard 3
  npm run e2e:report -- --run 28080895737

Options:
  --run <id>          Select a specific workflow run
  --project <name>    Filter by Playwright project
  --shard <number>    Filter by shard number
  --workflow <file>   Workflow file (default: build-test-and-deploy.yml)
  --refresh           Download again instead of using the cached report
  --list              List available reports without downloading
  -h, --help          Show this help
`;

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    console.log(help);
    return;
  }

  await ensureCommand(
    "gh",
    ["--version"],
    "Install and authenticate the GitHub CLI first: https://cli.github.com/",
  );

  const repository = await getRepository();
  const pullRequest =
    options.runId === undefined ? await getCurrentPullRequest() : undefined;
  const branch =
    options.runId === undefined
      ? (pullRequest?.headRefName ?? (await getCurrentBranch()))
      : undefined;
  const { workflowRun, artifacts } = await selectWorkflowRun(
    repository,
    options,
    branch,
  );
  const jobs = await listJobs(workflowRun.databaseId);
  const allReports = buildReports(artifacts, jobs);
  const reports = filterReports(allReports, options);

  printContext(repository, pullRequest, branch, workflowRun);
  if (reports.length === 0) {
    throw new Error(
      allReports.length === 0
        ? "This workflow run has no unexpired Playwright report artifacts."
        : "No report matches the requested project and shard.",
    );
  }

  if (options.listOnly) {
    printReports(reports);
    return;
  }

  const report =
    reports.length === 1 ? reports[0] : await promptForReport(reports);
  if (report === undefined) {
    throw new Error("No report selected.");
  }

  const reportDirectory = await downloadReport(
    repository,
    workflowRun.databaseId,
    report.artifact,
    options.refresh,
  );
  console.log(`\nOpening ${formatReportName(report)} from ${reportDirectory}`);
  await showReport(reportDirectory);
}

async function selectWorkflowRun(
  repository: string,
  options: Options,
  branch?: string,
): Promise<{ workflowRun: WorkflowRun; artifacts: GithubArtifact[] }> {
  if (options.runId !== undefined) {
    const [workflowRun, artifacts] = await Promise.all([
      getWorkflowRun(options.runId),
      listArtifacts(repository, options.runId),
    ]);
    return { workflowRun, artifacts };
  }

  if (branch === undefined) {
    throw new Error("Could not determine a branch.");
  }

  const workflowRuns = await listWorkflowRuns(branch, options.workflow);
  for (const workflowRun of workflowRuns) {
    const artifacts = await listArtifacts(repository, workflowRun.databaseId);
    if (
      artifacts.some(
        (artifact) =>
          artifact.name.startsWith("playwright-report-") && !artifact.expired,
      )
    ) {
      return { workflowRun, artifacts };
    }
  }

  throw new Error(
    `No recent ${options.workflow} run on ${branch} contains an unexpired Playwright report.`,
  );
}

function filterReports(
  reports: PlaywrightReport[],
  options: Options,
): PlaywrightReport[] {
  return reports.filter(
    (report) =>
      (options.project === undefined ||
        report.project.toLowerCase() === options.project.toLowerCase()) &&
      (options.shard === undefined || report.shard === options.shard),
  );
}

function printContext(
  repository: string,
  pullRequest: PullRequest | undefined,
  branch: string | undefined,
  runInfo: WorkflowRun,
): void {
  console.log("");
  console.log(
    pullRequest === undefined
      ? `${repository}${branch === undefined ? "" : ` — ${branch}`}`
      : `PR #${pullRequest.number} — ${pullRequest.title}`,
  );
  console.log(
    `Run #${runInfo.databaseId} — ${runInfo.status}/${runInfo.conclusion || "pending"} — ${new Date(
      runInfo.createdAt,
    ).toLocaleString()}`,
  );
  console.log(runInfo.url);
}

function printReports(reports: PlaywrightReport[]): void {
  console.log("");
  reports.forEach((report, index) => {
    console.log(
      `${String(index + 1).padStart(2)}. ${formatReportLine(report)}`,
    );
  });
}

async function promptForReport(
  reports: PlaywrightReport[],
): Promise<PlaywrightReport | undefined> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error(
      "Multiple reports match. Pass --project and --shard when running non-interactively.",
    );
  }

  printReports(reports);
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await readline.question("\nSelect a report [1]: ");
    const selection = answer.trim() === "" ? 1 : Number.parseInt(answer, 10);
    if (
      !Number.isInteger(selection) ||
      selection < 1 ||
      selection > reports.length
    ) {
      throw new Error(`Choose a number between 1 and ${reports.length}.`);
    }
    return reports[selection - 1];
  } finally {
    readline.close();
  }
}

function formatReportLine(report: PlaywrightReport): string {
  const name = formatReportName(report).padEnd(24);
  const conclusion = (report.conclusion ?? "unknown").padEnd(10);
  return `${name} ${conclusion} ${formatBytes(report.artifact.size_in_bytes).padStart(9)}`;
}

function formatReportName(report: PlaywrightReport): string {
  return `${formatProject(report.project)} ${report.shard}/${report.shardCount}`;
}

async function downloadReport(
  repository: string,
  runId: number,
  artifact: GithubArtifact,
  refresh: boolean,
): Promise<string> {
  const cacheRoot = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
  const destination = join(
    cacheRoot,
    "workadventure",
    "e2e-reports",
    String(runId),
    artifact.name,
  );
  const marker = join(destination, ".download-complete");

  if (!refresh && (await exists(marker))) {
    console.log(`\nUsing cached report ${destination}`);
    return destination;
  }

  const temporary = `${destination}.tmp-${process.pid}`;
  await rm(temporary, { recursive: true, force: true });
  if (refresh) {
    await rm(destination, { recursive: true, force: true });
  }
  await mkdir(temporary, { recursive: true });

  console.log(
    `\nDownloading ${artifact.name} (${formatBytes(artifact.size_in_bytes)})...`,
  );
  try {
    await run("gh", [
      "run",
      "download",
      String(runId),
      "--repo",
      repository,
      "--name",
      artifact.name,
      "--dir",
      temporary,
    ]);
    await writeFile(
      join(temporary, ".download-complete"),
      `${artifact.id}\n`,
      "utf8",
    );
    await rm(destination, { recursive: true, force: true });
    await mkdir(resolve(destination, ".."), { recursive: true });
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }

  return destination;
}

async function showReport(reportDirectory: string): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(
      "npm",
      [
        "exec",
        "--workspace=workadventure-e2e-tests",
        "--",
        "playwright",
        "show-report",
        "--host",
        "127.0.0.1",
        reportDirectory,
      ],
      {
        cwd: findRepositoryRoot(),
        stdio: "inherit",
        shell: false,
      },
    );
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0 || signal === "SIGINT") {
        resolvePromise();
      } else {
        reject(
          new Error(
            `Playwright report server exited with code ${code ?? "unknown"}.`,
          ),
        );
      }
    });
  });
}

function findRepositoryRoot(): string {
  return resolve(import.meta.dirname, "../../../..");
}

async function ensureCommand(
  command: string,
  args: string[],
  failureMessage: string,
): Promise<void> {
  try {
    await run(command, args);
  } catch {
    throw new Error(failureMessage);
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function parseOptions(args: string[]): Options {
  const options: Options = {
    workflow: "build-test-and-deploy.yml",
    refresh: false,
    listOnly: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    switch (argument) {
      case "--run":
        options.runId = parsePositiveInteger(
          readValue(args, ++index, argument),
          argument,
        );
        break;
      case "--project":
        options.project = readValue(args, ++index, argument);
        break;
      case "--shard":
        options.shard = parsePositiveInteger(
          readValue(args, ++index, argument),
          argument,
        );
        break;
      case "--workflow":
        options.workflow = readValue(args, ++index, argument);
        break;
      case "--refresh":
        options.refresh = true;
        break;
      case "--list":
        options.listOnly = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${argument}\n\n${help}`);
    }
  }

  return options;
}

function readValue(args: string[], index: number, option: string): string {
  const value = args[index];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function parsePositiveInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${option} must be a positive integer.`);
  }
  return parsed;
}

main().catch((error: unknown) => {
  console.error(
    `\nError: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
