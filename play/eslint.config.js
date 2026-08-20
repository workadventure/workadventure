// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { generateConfig } from "@workadventure/eslint-config";
import svelteParser from "svelte-eslint-parser";

export default [
    // Storybook config files are tooling, not app source (like eslint.config.js), and are
    // not covered by the typed `npm run lint` scope. Keep the typed parser from choking on
    // them when lint-staged picks them up.
    {
        ignores: [".storybook/**"],
    },
    ...generateConfig(import.meta.dirname),
    {
        files: ["**/*.svelte"],
        languageOptions: {
            parser: svelteParser,
            parserOptions: {
                svelteFeatures: {
                    runes: true,
                },
            },
            globals: {
                $bindable: "readonly",
                $derived: "readonly",
                $effect: "readonly",
                $host: "readonly",
                $inspect: "readonly",
                $props: "readonly",
                $state: "readonly",
            },
        },
    },
    {
        rules: {
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/restrict-plus-operands": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/no-unsafe-argument": "off",

            "listeners/no-missing-remove-event-listener": "error",
            "listeners/matching-remove-event-listener": "error",
            "listeners/no-inline-function-event-listener": "error",

            // https://github.com/un-ts/eslint-plugin-import-x/issues/308
            "import/no-duplicates": "off",

            // Uncomment this to detect circular dependencies in imports
            // It is slow (~7 minutes) but is really helpful to detect architectural issues
            // TODO: solve these issues one by one and then enable this rule in CI only
            //"import/no-cycle": [2, { "maxDepth": 5, "ignoreExternal": true }],
        },
    },
    ...storybook.configs["flat/recommended"],
];
