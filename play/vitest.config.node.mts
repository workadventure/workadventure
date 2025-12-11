import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "node",
        environment: "node",
        include: [
            "src/pusher/**/*.test.{js,ts}",
            "src/pusher/**/*.spec.{js,ts}",
            "tests/pusher/**/*.test.{js,ts}",
            "tests/pusher/**/*.spec.{js,ts}",
            "tests/room-api/**/*.test.{js,ts}",
            "tests/room-api/**/*.spec.{js,ts}",
        ],
        coverage: {
            all: true,
            include: ["src/pusher/**/*.ts"],
            exclude: ["src/i18n", "src/enum"],
        },
    },
});
