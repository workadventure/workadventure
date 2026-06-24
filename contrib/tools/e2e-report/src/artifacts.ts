export type Conclusion =
  | "success"
  | "failure"
  | "cancelled"
  | "skipped"
  | "neutral"
  | "timed_out"
  | "action_required"
  | null;

export interface GithubArtifact {
  id: number;
  name: string;
  size_in_bytes: number;
  expired: boolean;
}

export interface GithubJob {
  name: string;
  conclusion: Conclusion;
}

export interface PlaywrightReport {
  artifact: GithubArtifact;
  project: string;
  shard: number;
  shardCount: number;
  conclusion: Conclusion;
}

const artifactPattern = /^playwright-report-(.+)-(\d+)-(\d+)$/;

export function parsePlaywrightArtifact(
  artifact: GithubArtifact,
): Omit<PlaywrightReport, "conclusion"> | undefined {
  const match = artifact.name.match(artifactPattern);
  if (match === null) {
    return undefined;
  }

  const [, project, shard, shardCount] = match;
  if (
    project === undefined ||
    shard === undefined ||
    shardCount === undefined
  ) {
    return undefined;
  }

  return {
    artifact,
    project,
    shard: Number.parseInt(shard, 10),
    shardCount: Number.parseInt(shardCount, 10),
  };
}

export function getJobCoordinates(
  name: string,
): { project: string; shard: number; shardCount: number } | undefined {
  const standard = name.match(/^End to end tests with (.+) (\d+)\/(\d+)$/);
  if (standard !== null) {
    return coordinatesFromMatch(standard);
  }

  const singleDomain = name.match(
    /^Test production docker compose \((\d+)\/(\d+)\)$/,
  );
  if (singleDomain !== null) {
    return coordinatesFromMatch(singleDomain, "single-domain");
  }

  const helm = name.match(/^End to end tests in Kubernetes \((\d+)\/(\d+)\)$/);
  if (helm !== null) {
    return coordinatesFromMatch(helm, "helm");
  }

  return undefined;
}

function coordinatesFromMatch(
  match: RegExpMatchArray,
  fixedProject?: string,
): { project: string; shard: number; shardCount: number } | undefined {
  const project = fixedProject ?? match[1];
  const shard = fixedProject === undefined ? match[2] : match[1];
  const shardCount = fixedProject === undefined ? match[3] : match[2];

  if (
    project === undefined ||
    shard === undefined ||
    shardCount === undefined
  ) {
    return undefined;
  }

  return {
    project,
    shard: Number.parseInt(shard, 10),
    shardCount: Number.parseInt(shardCount, 10),
  };
}

export function buildReports(
  artifacts: GithubArtifact[],
  jobs: GithubJob[],
): PlaywrightReport[] {
  const conclusions = new Map<string, Conclusion>();
  for (const job of jobs) {
    const coordinates = getJobCoordinates(job.name);
    if (coordinates !== undefined) {
      conclusions.set(
        reportKey(
          coordinates.project,
          coordinates.shard,
          coordinates.shardCount,
        ),
        job.conclusion,
      );
    }
  }

  return artifacts
    .filter((artifact) => !artifact.expired)
    .map(parsePlaywrightArtifact)
    .filter(
      (report): report is Omit<PlaywrightReport, "conclusion"> =>
        report !== undefined,
    )
    .map((report) => ({
      ...report,
      conclusion:
        conclusions.get(
          reportKey(report.project, report.shard, report.shardCount),
        ) ?? null,
    }))
    .sort((left, right) => {
      const projectComparison = left.project.localeCompare(
        right.project,
        undefined,
        { numeric: true },
      );
      return projectComparison === 0
        ? left.shard - right.shard
        : projectComparison;
    });
}

function reportKey(project: string, shard: number, shardCount: number): string {
  return `${project}:${shard}:${shardCount}`;
}

export function formatProject(project: string): string {
  const knownProjects: Record<string, string> = {
    chromium: "Chromium",
    firefox: "Firefox",
    webkit: "WebKit",
    mobilechromium: "Mobile Chromium",
    mobilefirefox: "Mobile Firefox",
    mobilewebkit: "Mobile WebKit",
    "single-domain": "Single domain",
    helm: "Helm",
  };

  return knownProjects[project] ?? project;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }

  return `${value.toFixed(1)} ${unit}`;
}
