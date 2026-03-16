import { defineConfig } from "vitest/config"; // eslint-disable-line import/no-unresolved

export default defineConfig({
    test: {
        environment: "node",
        include: ["./tests/**/*.test.ts"],
        globalSetup: "./tests/globalTestSetup.ts",
        testTimeout: 60_000,
        hookTimeout: 60_000,
        fileParallelism: false,
    },
});
