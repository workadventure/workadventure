import {generateConfig} from "@workadventure/eslint-config";
import playwright from 'eslint-plugin-playwright'

export default [
    playwright.configs['flat/recommended'],
    ...generateConfig(import.meta.dirname),
    {
        rules: {
            ...playwright.configs['flat/recommended'].rules,
        }
    }
];
