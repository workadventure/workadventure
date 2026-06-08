import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["./tests/**/*.spec.ts"],
        coverage: {
            include: ["src/*.ts", "src/**/*.ts"],
        },
    },
});
