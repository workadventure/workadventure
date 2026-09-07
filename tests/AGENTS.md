# AGENTS.md - tests/

Playwright end-to-end tests.

## Setup
```bash
npm install
npx playwright install --with-deps
```

## Run tests
```bash
npm run test
npm run test -- tests/mytest.ts
npm run test -- tests/mytest.ts --project=chromium
npm run test-headed-chrome -- tests/mytest.ts
```

## Debugging a CI failure

A failing attempt uploads a trace, a screenshot and an `error-context.md` in the
`playwright-report-<project>-<shard>` artifact of the run. Open the trace with:

```bash
npx playwright show-trace path/to/trace.zip
```

The trace records the action timeline, screencast, network, console and sources, but **not** DOM
snapshots, so the trace viewer's time-travel DOM inspector will be empty. Snapshots are excluded by
default because they cost roughly 23% of total test time while everything else costs about 1%.

If you need the DOM inspector to chase a specific flake, add the **`full-trace`** label to the PR and
re-run. Related labels:

| Label | Effect |
|-------|--------|
| `full-trace` | Record DOM snapshots too, so the trace viewer can time-travel the DOM. Slower. |
| `no-flaky` | Disable retries, so a flaky test fails the build instead of passing on a second attempt. |

## How CI splits the suite

Each browser project is spread over several CI legs, but not with Playwright's `--shard`: that
balances the *number* of tests, and here the number of tests says little about how long they take.
Instead, `scripts/shard-list.mjs` packs whole spec files into shards by their measured duration,
read from `shard-timings.json`, and CI passes the result to `--test-list`.

Consequences when adding or moving tests:

- **A new spec file has no recorded duration** and is weighed as an average file until the timings
  are refreshed. That is fine for one or two files; `shard-list.mjs` warns once more than 20% of the
  files are unrecorded.
- **A single spec file is a floor** on how short a shard can get, because packing is per file. If one
  file grows past the others, split it rather than adding shards.
- **`--test-list` paths are relative to `testDir`** (`chat/matrixChat.spec.ts`, not
  `tests/chat/matrixChat.spec.ts`), and Playwright ignores entries it cannot match — a list gone
  stale would run nothing and still exit 0. CI therefore runs `shard-list.mjs --verify`, which
  resolves the list through Playwright and fails when it selects no test.

Refresh the durations from a run where every leg finished:

```bash
npm run e2e:timings                 # newest successful run on master
npm run e2e:timings -- --run <id>   # a specific run
```

Then resize the shard counts in the `end-to-end-tests` matrix of
`.github/workflows/build-test-and-deploy.yml` if a project has drifted. Preview what a given split
would look like with:

```bash
node scripts/shard-list.mjs --project chromium --shard 1 --of 6
```
