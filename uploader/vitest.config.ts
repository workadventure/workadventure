import { defineConfig } from "vitest/config"; // eslint-disable-line import/no-unresolved

export default defineConfig({
    test: {
        coverage: {
            include: ["src/*.ts", "src/**/*.ts"],
        },
    },
});
