import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        projects: [
            {
                extends: true,
                plugins: [
                    mediapipeWorkaround(),
                    svelte({
                        preprocess: vitePreprocess(),
                    }),
                    storybookTest({ configDir: path.join(dirname, ".storybook") }),
                ],
                test: {
                    name: "storybook",
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright({}),
                        instances: [{ browser: "chromium" }],
                    },
                },
            },
        ],
    },
});

function mediapipeWorkaround() {
    return {
        name: "mediapipe_workaround",
        load(id: string) {
            const filePath = id.split("?")[0];
            if (path.basename(filePath) === "selfie_segmentation.js" && fs.existsSync(filePath)) {
                let code = fs.readFileSync(filePath, "utf-8");
                code += "\nexport const SelfieSegmentation = globalThis.SelfieSegmentation;\n";
                return { code };
            }

            return null;
        },
    };
}
