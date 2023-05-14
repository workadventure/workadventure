import { defineConfig } from "vitest/config"; // eslint-disable-line import/no-unresolved

export default defineConfig({
    test: {
        globals: true,
        coverage: {
            all: true,
            include: ["src/*.ts", "src/**/*.ts"],
            exclude: ["src/Messages"],
            reporter: ["json-summary"],
        },
        reporters: ["json"],
    },
});
