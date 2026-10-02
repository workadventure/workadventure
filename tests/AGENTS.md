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
