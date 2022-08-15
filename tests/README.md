# End-to-end tests

This directory contains automated end to end tests.

## Installation

```bash
npm install
npx playwright install --with-deps
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
npm run headed-test -- tests/[your_test_file.ts]
```


## Run on production like environment

Start WorkAdventure with:

```bash
docker-compose -f docker-compose.yaml -f docker-compose-oidc.yaml -f docker-compose.e2e.yml up -d --build
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
