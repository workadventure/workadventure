import { defineConfig, mergeConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import viteConfig from "./vite.config.mjs";

export default defineConfig(configEnv => mergeConfig(
    viteConfig(configEnv),
    defineConfig({
        test: {
            name: "front-browser",
            environment: "jsdom",
            setupFiles: ["./tests/setup/vitest.setup.ts"],
            browser: {
                provider: playwright(),
                enabled: true,
                instances: [
                    { browser: "chromium" },
                ]
            },
            include: [
                "src/front/**/*.test.{js,ts}",
                "src/front/**/*.spec.{js,ts}",
                "tests/front/**/*.test.{js,ts}",
                "tests/front/**/*.spec.{js,ts}",
            ],
            exclude: [
                // Exclude tests with vi.mock() or tslib issues - not compatible with browser mode
                "**/node_modules/**",
                "**/dist/**",
                //"src/front/Space/tests/*.test.ts",
                "src/front/Chat/Connection/Matrix/tests/MatrixSecurity.test.ts",
                "src/front/Chat/Connection/Matrix/tests/MatrixClientWrapper.test.ts",
                "src/front/Chat/Connection/Matrix/tests/MatrixChatConnection.test.ts",
                "tests/front/Utils/PathfindingManager.test.ts",
                // Exclude tests with tslib issues in browser mode
                "src/front/Utils/ThrottlingDetector.test.ts",
                "tests/front/Stores/Utils/ConcatenateMapStore.test.ts",
                "tests/front/Stores/Utils/ConcatenateStore.test.ts",
                "tests/front/Stores/Utils/ForwardableStore.test.ts",
                "tests/front/Stores/Utils/MapStore.test.ts",
                "tests/front/Stores/Utils/NestedStore.test.ts",
            ],
            coverage: {
                provider: "v8",
            },
        },
    })
));
