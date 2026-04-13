import {generateConfig} from "@workadventure/eslint-config";
import playwright from 'eslint-plugin-playwright'

export default [
    playwright.configs['flat/recommended'],
    ...generateConfig(import.meta.dirname),
    {
        rules: {
            ...playwright.configs['flat/recommended'].rules,
            // Allow conditional skips with a reason message
            'playwright/no-skipped-test': [
                'error',
                { allowConditional: true }
            ],
            // False positive because some expect calls are in helper functions
            'playwright/expect-expect': 'off',
            "playwright/no-wait-for-timeout": "error",
            "playwright/no-conditional-in-test": "error",
            // In tests, we don't need to be as strict as in production code
            // We happily allow "any", unsafe calls, member access, assignments, and returns
            // In the worst case, the code will crash, and the test will fail.
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "no-await-in-loop": "off",
            "@typescript-eslint/require-await": "off",
            "svelte/no-ignored-unsubscribe": "off",
            "rxjs/no-ignored-subscription": "off",
        }
    }
];
