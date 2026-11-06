import { defineConfig } from "vitest/config";

// Unit tests only: the end-to-end tests in tests/e2e drive the packaged app with Playwright.
export default defineConfig({
    test: {
        include: ["tests/unit/**/*.test.ts"],
    },
});
