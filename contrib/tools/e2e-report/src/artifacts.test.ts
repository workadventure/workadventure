import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReports,
  formatBytes,
  getJobCoordinates,
  parsePlaywrightArtifact,
} from "./artifacts.js";

test("parses projects containing hyphens from the right-hand shard suffix", () => {
  const report = parsePlaywrightArtifact({
    id: 1,
    name: "playwright-report-single-domain-2-4",
    size_in_bytes: 1024,
    expired: false,
  });

  assert.equal(report?.project, "single-domain");
  assert.equal(report?.shard, 2);
  assert.equal(report?.shardCount, 4);
});

test("correlates report artifacts with standard and deployment jobs", () => {
  const artifacts = [
    {
      id: 1,
      name: "playwright-report-firefox-3-4",
      size_in_bytes: 1024,
      expired: false,
    },
    {
      id: 2,
      name: "playwright-report-helm-1-2",
      size_in_bytes: 2048,
      expired: false,
    },
  ];
  const reports = buildReports(artifacts, [
    { name: "End to end tests with firefox 3/4", conclusion: "failure" },
    { name: "End to end tests in Kubernetes (1/2)", conclusion: "success" },
  ]);

  assert.deepEqual(
    reports.map(({ project, shard, conclusion }) => ({
      project,
      shard,
      conclusion,
    })),
    [
      { project: "firefox", shard: 3, conclusion: "failure" },
      { project: "helm", shard: 1, conclusion: "success" },
    ],
  );
});

test("recognizes all current workflow job naming schemes", () => {
  assert.deepEqual(getJobCoordinates("End to end tests with chromium 1/4"), {
    project: "chromium",
    shard: 1,
    shardCount: 4,
  });
  assert.deepEqual(getJobCoordinates("Test production docker compose (2/2)"), {
    project: "single-domain",
    shard: 2,
    shardCount: 2,
  });
  assert.deepEqual(getJobCoordinates("End to end tests in Kubernetes (1/2)"), {
    project: "helm",
    shard: 1,
    shardCount: 2,
  });
});

test("filters expired and unrelated artifacts", () => {
  const reports = buildReports(
    [
      {
        id: 1,
        name: "playwright-report-webkit-1-3",
        size_in_bytes: 1,
        expired: true,
      },
      { id: 2, name: "play", size_in_bytes: 1, expired: false },
    ],
    [],
  );

  assert.deepEqual(reports, []);
});

test("formats artifact sizes", () => {
  assert.equal(formatBytes(999), "999 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(5 * 1024 * 1024), "5.0 MB");
});
