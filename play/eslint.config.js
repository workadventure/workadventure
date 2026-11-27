import { generateConfig } from "@workadventure/eslint-config";
import svelteParser from "svelte-eslint-parser";

export default [
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
    {
        // Onboarding learns what the user does from anchors and analytics events, so feature code imports nothing of it
        // but the anchors. The Help menu is onboarding's own UI. See docs/agent/onboarding.md.
        files: ["src/front/**/*.{ts,svelte}"],
        ignores: [
            "src/front/Onboarding/**",
            "src/front/Components/Onboarding/**",
            "src/front/Components/Menu/HelpSubMenu.svelte",
        ],
        rules: {
            "import/no-restricted-paths": [
                "error",
                {
                    zones: [
                        { target: "./src/front", from: "./src/front/Onboarding", except: ["./OnboardingAnchors.ts"] },
                    ],
                },
            ],
        },
    },
    {
        // A tip names anchors and analytics events; it does not reach into the components.
        files: ["src/front/Onboarding/tips/**"],
        rules: {
            "import/no-restricted-paths": [
                "error",
                { zones: [{ target: "./src/front/Onboarding/tips", from: "./src/front/Components" }] },
            ],
        },
    },
];
