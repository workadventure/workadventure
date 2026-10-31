import { defineConfig } from "@playwright/test";
import base from "../playwright.config";

// Documentation screenshots, not tests: outside the E2E testDir (./tests) so CI never runs them.
// Rerun by hand from the repository root: npx playwright test -c tests/docs-screenshots [<file>]
export default defineConfig({
    ...base,
    testDir: ".",
    testMatch: /\.shots\.ts$/,
    timeout: 300_000,
    retries: 0,
    reporter: "line",
    projects: base.projects?.filter((project) => project.name === "chromium"),
});
