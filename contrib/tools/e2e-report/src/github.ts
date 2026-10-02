import { spawn } from "node:child_process";

import type { GithubArtifact, GithubJob } from "./artifacts.js";

export interface PullRequest {
  number: number;
  title: string;
  headRefName: string;
  url: string;
}

export interface WorkflowRun {
  databaseId: number;
  displayTitle: string;
  status: string;
  conclusion: string;
  createdAt: string;
  url: string;
}

interface ArtifactResponse {
  artifacts: GithubArtifact[];
}

interface JobsResponse {
  jobs: GithubJob[];
}

export async function run(
  command: string,
  args: string[],
  options: { allowFailure?: boolean } = {},
): Promise<string> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 || options.allowFailure === true) {
        resolve(stdout.trim());
        return;
      }

      reject(
        new Error(`${command} ${args.join(" ")} failed:\n${stderr.trim()}`),
      );
    });
  });
}

export async function getRepository(): Promise<string> {
  const output = await run("gh", [
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "--jq",
    ".nameWithOwner",
  ]);
  if (output === "") {
    throw new Error("Could not determine the GitHub repository.");
  }
  return output;
}

export async function getCurrentBranch(): Promise<string> {
  const branch = await run("git", ["branch", "--show-current"]);
  if (branch === "") {
    throw new Error(
      "The repository is in detached HEAD state. Pass --run <id> to select a workflow run.",
    );
  }
  return branch;
}

export async function getCurrentPullRequest(): Promise<
  PullRequest | undefined
> {
  const output = await run(
    "gh",
    ["pr", "view", "--json", "number,title,headRefName,url"],
    { allowFailure: true },
  );
  return output === "" ? undefined : (JSON.parse(output) as PullRequest);
}

export async function listWorkflowRuns(
  branch: string,
  workflow: string,
): Promise<WorkflowRun[]> {
  const output = await run("gh", [
    "run",
    "list",
    "--branch",
    branch,
    "--workflow",
    workflow,
    "--limit",
    "10",
    "--json",
    "databaseId,displayTitle,status,conclusion,createdAt,url",
  ]);
  return JSON.parse(output) as WorkflowRun[];
}

export async function getWorkflowRun(runId: number): Promise<WorkflowRun> {
  const output = await run("gh", [
    "run",
    "view",
    String(runId),
    "--json",
    "databaseId,displayTitle,status,conclusion,createdAt,url",
  ]);
  return JSON.parse(output) as WorkflowRun;
}

export async function listArtifacts(
  repository: string,
  runId: number,
): Promise<GithubArtifact[]> {
  const output = await run("gh", [
    "api",
    `repos/${repository}/actions/runs/${runId}/artifacts`,
    "--paginate",
    "--slurp",
  ]);
  const pages = JSON.parse(output) as ArtifactResponse[];
  return pages.flatMap((page) => page.artifacts);
}

export async function listJobs(runId: number): Promise<GithubJob[]> {
  const output = await run("gh", [
    "run",
    "view",
    String(runId),
    "--json",
    "jobs",
  ]);
  return (JSON.parse(output) as JobsResponse).jobs;
}
