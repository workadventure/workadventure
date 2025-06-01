import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["./tests/**/*.spec.ts"],
        coverage: {
            all: true,
            include: ["src/*.ts", "src/**/*.ts"],
        },
    },
});
