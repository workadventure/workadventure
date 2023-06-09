import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        coverage: {
            all: true,
            include: ["src/*.ts", "src/**/*.ts"],
            exclude: ["src/i18n", "src/enum"],
        },
    },
});
