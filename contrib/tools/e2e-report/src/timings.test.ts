import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTimings,
  normalizeSpecPath,
  parseDurationSeconds,
  parseJobLog,
} from "./timings.js";

const timestamp = "2026-08-11T07:18:51.2759136Z";

test("reads the project, spec file and duration off a run line", () => {
  const entries = parseJobLog(
    `${timestamp}   ✓   1 [chromium] › tests/chat/matrixChat.spec.ts:35:5 › a title (45.6s)`,
  );

  assert.deepEqual(entries, [
    {
      project: "chromium",
      file: "chat/matrixChat.spec.ts",
      testId: "tests/chat/matrixChat.spec.ts:35:5 › a title",
      seconds: 45.6,
    },
  ]);
});

test("records a skipped test, which carries no duration, at zero", () => {
  const entries = parseJobLog(
    `${timestamp}   -  10 [webkit] › tests/livekit.spec.ts:8:5 › skipped title`,
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.seconds, 0);
});

test("converts every duration unit the list reporter prints", () => {
  assert.equal(parseDurationSeconds("649", "ms"), 0.649);
  assert.equal(parseDurationSeconds("45.6", "s"), 45.6);
  assert.equal(parseDurationSeconds("1.1", "m"), 66);
});

test("strips the working-directory prefix so paths match --test-list", () => {
  assert.equal(normalizeSpecPath("tests/chat/a.spec.ts"), "chat/a.spec.ts");
  assert.equal(normalizeSpecPath("chat/a.spec.ts"), "chat/a.spec.ts");
});

test("keeps the longest attempt of a retried test instead of adding the attempts up", () => {
  const entries = parseJobLog(
    [
      `${timestamp}   ✘   1 [chromium] › tests/a.spec.ts:1:1 › flaky (30.0s)`,
      `${timestamp}   ✓   1 [chromium] › tests/a.spec.ts:1:1 › flaky (retry #1) (10.0s)`,
    ].join("\n"),
  );

  assert.equal(entries[0]?.testId, entries[1]?.testId);

  const timings = buildTimings(entries, ["a.spec.ts"], ["chromium"]);
  assert.equal(timings["chromium"]?.["a.spec.ts"], 30);
});

test("sums the tests of a spec file", () => {
  const entries = parseJobLog(
    [
      `${timestamp}   ✓   1 [firefox] › tests/a.spec.ts:1:1 › one (2.0s)`,
      `${timestamp}   ✓   2 [firefox] › tests/a.spec.ts:5:1 › two (3.0s)`,
    ].join("\n"),
  );

  const timings = buildTimings(entries, ["a.spec.ts"], ["firefox"]);
  assert.equal(timings["firefox"]?.["a.spec.ts"], 5);
});

test("records a spec file that ran nothing in a project at zero, not as missing", () => {
  const timings = buildTimings([], ["a.spec.ts", "b.spec.ts"], ["webkit"]);

  assert.deepEqual(timings["webkit"], { "a.spec.ts": 0, "b.spec.ts": 0 });
});

test("ignores results from a project outside the requested list", () => {
  const entries = parseJobLog(
    `${timestamp}   ✓   1 [helm] › tests/a.spec.ts:1:1 › one (2.0s)`,
  );

  const timings = buildTimings(entries, ["a.spec.ts"], ["chromium"]);
  assert.deepEqual(timings, { chromium: { "a.spec.ts": 0 } });
});
