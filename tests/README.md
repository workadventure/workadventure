# End-to-end tests

This directory contains automated end to end tests.

## Installation

```bash
npm install
npx playwright install --with-deps
```

## Build typings

In order to remove warnings in your IDE, you need to build the typings from the scripting API.

Run:

```console
docker compose exec play npm run build-typings
```

If you change the scripting API, you will need to re-run this command.

## Build room-api-clients
```bash
cd libs/room-api-clients/room-api-client-js/
npm install
npm run ts-proto
npm run build
```

## Run on development environment

Start WorkAdventure with:

```bash
docker-compose up -d
```

Wait 2-3 minutes for the environment to start, then:

Start the tests with:

```bash
npm run test
```

In development, if you want to run a specific test in "headed" mode (visible mode), with only Chromium, run:

```bash
npm run test-headed -- tests/[your_test_file.ts]
```


## Run on production like environment

Start WorkAdventure with:

```bash
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker compose -f docker-compose.yaml -f docker-compose.e2e.yml -f docker-compose.livekit.yaml up -d --build --scale egress=2
```

Start the tests with:

```bash
npm run test-prod-like
```

## Run selected tests

End-to-end tests can take a while to run. To run only one test in one browser, use:

```bash
npm run test -- [name of the test file] --project=[chromium|firefox|webkit]
```


To run tests in "headed" mode, only for Chromium, run:

```bash
npm run test-headed-chrome -- [name of the test file]
```

Alternatively, to run a test in "headed" mode, only for Firefox, run:

```bash
npm run test-headed-firefox -- [name of the test file]
```

## CI sharding

CI splits the suite across 14 parallel jobs (see the `end-to-end-tests` matrix in
`.github/workflows/build-test-and-deploy.yml`). The pipeline is only as fast as its
slowest job, so those jobs need to take roughly the same time.

Playwright's `--shard` balances by test **count**, which is not the same thing: a 0.7s
error-page check and a 60s matrix-chat test both count as "1". An evenly-counted split left
the chromium shards 3.5x apart in wall time (1249s vs 362s), and the slow one alone set the
pipeline's duration.

So each project also passes `PWTEST_SHARD_WEIGHTS` ("a:b:c"), which sets each shard's test
count explicitly. Shards are still contiguous runs of whole spec files in listing order, so
choosing the counts places the boundaries — and the boundaries can be placed to balance
duration instead of count.

Those weights are a snapshot of one CI run's timings, so they drift as tests are added and
changed. **Regenerate them after adding or substantially changing tests:**

```bash
node scripts/shard-weights.mjs            # uses the latest successful run
node scripts/shard-weights.mjs <runId>    # or a specific one
```

It reads per-test durations from a finished run's logs and prints a `shardWeights` line per
project; copy each into the matching matrix entries. It needs `gh` authenticated and the
room-api client built (see [Build room-api-clients](#build-room-api-clients)), otherwise
`--list` cannot import `room-api.spec.ts`.

Stale weights degrade gracefully rather than breaking — Playwright rescales them
proportionally, so every test still runs, the shards just drift back towards unbalanced. If
you change a project's shard count in the workflow, update `PROJECTS` at the top of the
script to match.
