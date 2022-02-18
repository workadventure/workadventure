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
docker-compose up -d
```

Wait 2-3 minutes for the environment to start, then:

Start the tests with:

```bash
ADMIN_API_TOKEN=123 npm run test
```

You'll need to adapt the `ADMIN_API_TOKEN` to the value you use in your `.env` file.

## Run on production like environment

Start WorkAdventure with:

```bash
docker-compose -f docker-compose.yaml -f docker-compose.e2e.yml up -d --build
```

Start the tests with:

```bash
ADMIN_API_TOKEN=123 npm run test-prod-like
```

You'll need to adapt the `ADMIN_API_TOKEN` to the value you use in your `.env` file.

## Run selected tests

End-to-end tests can take a while to run. To run only one test in one browser, use:

```bash
ADMIN_API_TOKEN=123 npm run test -- [name of the test file] --project=[chromium|firefox|webkit]
```
