import type { StorybookConfig } from "@storybook/svelte-vite";

import { dirname } from "path";

import { fileURLToPath } from "url";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
    return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
const config: StorybookConfig = {
    stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|ts|svelte)"],
    addons: [
        getAbsolutePath("@storybook/addon-svelte-csf"),
        getAbsolutePath("@chromatic-com/storybook"),
        getAbsolutePath("@storybook/addon-vitest"),
        getAbsolutePath("@storybook/addon-a11y"),
        getAbsolutePath("@storybook/addon-docs"),
    ],
    framework: getAbsolutePath("@storybook/svelte-vite"),
};
export default config;
