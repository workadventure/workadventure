import { defineConfig } from "vitest/config"; // eslint-disable-line import/no-unresolved

export default defineConfig({
    test: {
        coverage: {
            all: true,
            include: ["src/*.ts", "src/**/*.ts"],
        },
    },
});
