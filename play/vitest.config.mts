import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        setupFiles: ["./tests/setup/vitest.setup.ts"],
        coverage: {
            all: true,
            include: ["src/*.ts", "src/**/*.ts"],
            exclude: ["src/i18n", "src/enum"],
        },
        projects: [
            "vitest.config.front.mts",
            "vitest.config.node.mts",
        ],
    },
});

