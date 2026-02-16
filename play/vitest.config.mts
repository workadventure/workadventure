import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        globals: true,
        environment: "happy-dom",
        coverage: {
            all: true,
            include: ["src/**/*.ts"],
            exclude: ["src/**/*.test.ts", "src/**/*.spec.ts"],
        },
    },
});
