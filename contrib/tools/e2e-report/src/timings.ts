/**
 * Extracts per-spec-file durations from the `list` reporter output of the end-to-end jobs.
 *
 * These durations feed `tests/shard-timings.json`, which `tests/scripts/shard-list.mjs` uses to
 * split each Playwright project into shards of roughly equal wall-clock time.
 *
 * The job log is the source rather than the uploaded HTML report because the `list` reporter
 * already prints one line per test with its duration, and that line survives in the log of every
 * leg, green or red.
 */

/**
 * A run line looks like:
 *   2026-08-11T07:18:51.2759136Z   ✓   1 [chromium] › tests/chat/matrixChat.spec.ts:35:5 › title (45.6s)
 * Skipped tests carry a `-` marker and no duration.
 */
const testLinePattern =
  /(?:✓|✘|×|-)\s+\d+\s+\[([^\]]+)\]\s+›\s+(\S+?\.spec\.ts):(\d+):(\d+)\s+›\s+(.*?)(?:\s+\((\d+(?:\.\d+)?)(ms|s|m)\))?$/u;

export interface TestEntry {
  project: string;
  /** Spec path relative to Playwright's `testDir`, the form `--test-list` matches. */
  file: string;
  testId: string;
  seconds: number;
}

export type ProjectTimings = Record<string, number>;
export type Timings = Record<string, ProjectTimings>;

export function parseDurationSeconds(value: string, unit: string): number {
  const amount = Number.parseFloat(value);
  switch (unit) {
    case "ms":
      return amount / 1000;
    case "s":
      return amount;
    case "m":
      return amount * 60;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

/** A retried test is reprinted with this suffix, which is the only thing telling it apart. */
const retrySuffixPattern = /\s+\(retry #\d+\)$/u;

/**
 * The `list` reporter prints run lines relative to the working directory (`tests/chat/x.spec.ts`)
 * but `--test-list` resolves entries against `testDir` (`chat/x.spec.ts`). Normalise to the latter.
 */
export function normalizeSpecPath(raw: string): string {
  const path = raw.split("\\").join("/");
  return path.startsWith("tests/") ? path.slice("tests/".length) : path;
}

export function parseJobLog(log: string): TestEntry[] {
  const entries: TestEntry[] = [];

  for (const line of log.split("\n")) {
    const match = line.match(testLinePattern);
    if (match === null) {
      continue;
    }

    const [, project, file, line_, column, title, value, unit] = match;
    if (
      project === undefined ||
      file === undefined ||
      line_ === undefined ||
      column === undefined ||
      title === undefined
    ) {
      continue;
    }

    entries.push({
      project,
      file: normalizeSpecPath(file),
      testId: `${file}:${line_}:${column} › ${title.replace(retrySuffixPattern, "")}`,
      seconds:
        value === undefined || unit === undefined
          ? 0
          : parseDurationSeconds(value, unit),
    });
  }

  return entries;
}

/**
 * A retried test prints once per attempt, so the longest attempt is kept rather than the sum: a
 * shard that had one flake should not be modelled as permanently slower.
 *
 * `knownSpecFiles` is every spec file present in the repository. Files that ran no test in a
 * project — every one of their tests filtered out by that project's tag filter — are recorded at
 * zero, which is what lets `shard-list.mjs` tell "free here" apart from "added since the last
 * collection" and weigh the latter as an average file instead of as nothing.
 */
export function buildTimings(
  entries: TestEntry[],
  knownSpecFiles: readonly string[],
  projects: readonly string[],
): Timings {
  const longestAttempt = new Map<string, TestEntry>();
  for (const entry of entries) {
    const key = `${entry.project}\u0000${entry.testId}`;
    const previous = longestAttempt.get(key);
    if (previous === undefined || entry.seconds > previous.seconds) {
      longestAttempt.set(key, entry);
    }
  }

  const timings: Timings = {};
  for (const project of projects) {
    const perFile: ProjectTimings = {};
    for (const file of knownSpecFiles) {
      perFile[file] = 0;
    }
    timings[project] = perFile;
  }

  for (const entry of longestAttempt.values()) {
    const perFile = timings[entry.project];
    if (perFile === undefined) {
      continue;
    }
    perFile[entry.file] = (perFile[entry.file] ?? 0) + entry.seconds;
  }

  for (const project of Object.keys(timings)) {
    const perFile = timings[project];
    if (perFile === undefined) {
      continue;
    }
    timings[project] = Object.fromEntries(
      Object.entries(perFile)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([file, seconds]) => [file, Math.round(seconds * 10) / 10]),
    );
  }

  return timings;
}
