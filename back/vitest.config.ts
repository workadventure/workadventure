import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            all: true,
            include: ["src/*.ts", "src/**/*.ts"],
        },
    },
});
