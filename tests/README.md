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
docker-compose -f docker-compose.yaml -f docker-compose-oidc.yaml up -d
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
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose -f docker-compose.yaml -f docker-compose-oidc.yaml -f docker-compose.e2e.yml up -d --build
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
