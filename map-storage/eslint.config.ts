import { defineConfig } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslintEslintPlugin from "@typescript-eslint/eslint-plugin";
import rxjs from "eslint-plugin-rxjs";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:prettier/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
        "plugin:rxjs/recommended",
    ],

    plugins: [
        "@typescript-eslint",
        "rxjs",
    ],

    languageOptions: {
        globals: {
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "module",

        parserOptions: {
            project: "tsconfig.json",
            tsconfigRootDir: "/home/dan/workadventure/workadventure.src/workadventure/map-storage",
        },
    },

    settings: {
        typescript: true,
        node: true,
    },

    rules: {
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "error",

        "@typescript-eslint/no-unused-vars": ["error", {
            args: "none",
            caughtErrors: "all",
            varsIgnorePattern: "_exhaustiveCheck",
        }],

        "import/order": "error",
        "no-async-promise-executor": "error",
        "no-await-in-loop": "error",
        "no-promise-executor-return": "error",
        "require-atomic-updates": "error",
        "prefer-promise-reject-errors": "error",
        "rxjs/no-ignored-subscription": "error",
        "@typescript-eslint/consistent-type-imports": "error",
    },
}]);