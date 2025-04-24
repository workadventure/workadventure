// @ts-check

//import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tseslint from "typescript-eslint";
import rxjs from "@smarttools/eslint-plugin-rxjs";
import unusedImports from "eslint-plugin-unused-imports";
import tsParser from "@typescript-eslint/parser";
import parser from "svelte-eslint-parser";
import importPlugin from 'eslint-plugin-import';
import svelte from 'eslint-plugin-svelte';


export default [
    "eslint:recommended",
    //tseslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    //typescriptEslint.configs.recommendedTypeChecked,
    //"plugin:@typescript-eslint/eslint-recommended",
    //"plugin:@typescript-eslint/recommended",
    //"plugin:@typescript-eslint/recommended-requiring-type-checking",

    importPlugin.flatConfigs.recommended,
    importPlugin.flatConfigs.typescript,
    rxjs.configs.recommended,
    ...svelte.configs.recommended,

    //"plugin:import/recommended",
    //"plugin:import/typescript",
    //"plugin:rxjs/recommended",
    //"plugin:svelte/recommended",
    {
        files: ["**/*.svelte"],

        languageOptions: {
            parser: parser,
            ecmaVersion: 5,
            sourceType: "script",

            parserOptions: {
                parser: "@typescript-eslint/parser",
            },
        },
    },
    {
        files: ["{src,tests}/**/*.ts", "{src,tests}/**/*.js", "{src,tests}/**/*.svelte"],
        ignores: ["**/generated/*.ts"],

        languageOptions: {
            globals: {
                /*...globals.browser,
                ...globals.node,*/
                Atomics: "readonly",
                SharedArrayBuffer: "readonly",
            },

            parser: tsParser,
            ecmaVersion: 2018,
            sourceType: "module",

            parserOptions: {
                project: "./tsconfig.json",
                extraFileExtensions: [".svelte"],
            },
        },
    },
    {

    plugins: {
        //"@typescript-eslint": typescriptEslint,
        rxjs: rxjs,
        "unused-imports": unusedImports,
    },

    settings: {
        typescript: true,
        node: true,

        "import/resolver": {
            typescript: {},
        },
    },

    rules: {
        "no-unused-vars": "off",
        "eol-last": ["error", "always"],
        "@typescript-eslint/no-explicit-any": "error",
        "no-throw-literal": "error",

        "@typescript-eslint/no-unused-vars": ["error", {
            args: "none",
            caughtErrors: "all",
            varsIgnorePattern: "_exhaustiveCheck",
        }],

        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/restrict-plus-operands": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/ban-ts-ignore": "off",
        "@typescript-eslint/no-unsafe-enum-comparison": "off",
        "@typescript-eslint/no-redundant-type-constituents": "off",

        "import/order": "error",
        "no-async-promise-executor": "error",
        "no-await-in-loop": "error",
        "no-promise-executor-return": "error",
        "require-atomic-updates": "error",
        "prefer-promise-reject-errors": "error",
        "rxjs/no-ignored-subscription": "error",
        "svelte/require-each-key": "error",

        "svelte/valid-compile": ["error", {
            ignoreWarnings: true,
        }],

        "svelte/no-at-html-tags": "off",
        "import/default": "off",
        "import/no-named-as-default": "off",
        "import/no-named-as-default-member": "off",
        "svelte/no-ignored-unsubscribe": "error",
        "unused-imports/no-unused-imports": "error",
    },
}];