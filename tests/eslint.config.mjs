import {generateConfig} from "@workadventure/eslint-config";
import playwright from 'eslint-plugin-playwright'

export default [
    playwright.configs['flat/recommended'],
    ...generateConfig(import.meta.dirname),
    {
        rules: {
            ...playwright.configs['flat/recommended'].rules,
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "no-await-in-loop": "off",
        }
    }
];
