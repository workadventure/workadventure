import { fileURLToPath } from "url";
import type { StorybookConfig } from "@storybook/svelte-vite";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { mergeConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const config: StorybookConfig = {
    stories: ["../src/**/*.stories.ts"],
    addons: ["@storybook/addon-vitest"],
    framework: {
        name: "@storybook/svelte-vite",
        options: {},
    },
    viteFinal: (config) =>
        mergeConfig(config, {
            plugins: [
                tailwindcss(),
                nodePolyfills({
                    include: ["events"],
                }),
                Icons({
                    compiler: "svelte",
                }),
                tsconfigPaths(),
            ],
            resolve: {
                alias: {
                    events: "events",
                    "@wa-icons": fileURLToPath(new URL("../src/front/Components/Icons.ts", import.meta.url)),
                    "@wa-modals": fileURLToPath(
                        new URL("../src/front/Components/Modal/modalManager.ts", import.meta.url),
                    ),
                },
            },
            optimizeDeps: {
                exclude: ["svelte-modals", "@mediapipe/selfie_segmentation"],
                esbuildOptions: {
                    define: {
                        global: "globalThis",
                    },
                },
            },
        }),
};

export default config;
