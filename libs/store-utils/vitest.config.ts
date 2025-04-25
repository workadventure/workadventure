import { defineConfig } from "vitest/config"; // eslint-disable-line import/no-unresolved

export default defineConfig({
    test: {
        include: ["./tests/**/*.test.ts"],
        coverage: {
            all: true,
            include: ["src/*.ts", "src/**/*.ts"],
        },
    },
});
