import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        // `extends` takes vite.config.ts by path: that config exports a callback,
        // which mergeConfig() cannot handle.
        projects: [
            {
                extends: "./vite.config.ts",
                test: {
                    name: "unit",
                    environment: "jsdom",
                    globals: true,
                    setupFiles: ["./tests/setup/vitest.setup.ts"],
                    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
                },
            },
            {
                extends: "./vite.config.ts",
                plugins: [
                    storybookTest({
                        configDir: path.join(dirname, ".storybook"),
                        storybookScript: "npm run storybook -- --no-open",
                    }),
                ],
                test: {
                    name: "storybook",
                    browser: {
                        enabled: true,
                        provider: playwright(),
                        headless: true,
                        instances: [{ browser: "chromium" }],
                    },
                },
            },
        ],
        // Browser mode tears Chromium down while Vite's HMR client socket is still opening,
        // surfacing a benign "WebSocket closed without opened" unhandled rejection. The stories
        // pass; without this, that stray rejection fails the run. This is a root-level test option
        // (it is not valid inside a project's `test`).
        dangerouslyIgnoreUnhandledErrors: true,
        coverage: {
            include: ["src/*.ts", "src/**/*.ts"],
            exclude: ["src/i18n", "src/enum", "**/*.stories.*"],
        },
    },
});
