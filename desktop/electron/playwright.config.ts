import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests of the desktop shell (tests/e2e; the unit tests in tests/unit are vitest's). CI runs
 * them against the packaged app of each OS (WA_E2E_EXECUTABLE), a local run against `dist/main.js`
 * (`yarn build` first).
 */
export default defineConfig({
    testDir: "tests/e2e",
    timeout: 60_000,
    // CI runners start an app and its windows slower than a laptop.
    expect: { timeout: 15_000 },
    // Every test starts its own app with its own profile: one at a time keeps focus and screens calm.
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]] : "list",
    outputDir: "e2e-results",
});
