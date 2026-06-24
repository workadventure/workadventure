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
