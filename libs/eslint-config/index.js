
//import typescriptEslint from "@typescript-eslint/eslint-plugin";
import eslint from '@eslint/js';
import tseslint from "typescript-eslint";
import rxjs from "@smarttools/eslint-plugin-rxjs";
import { defineConfig, globalIgnores } from "eslint/config";

//import unusedImports from "eslint-plugin-unused-imports";
//import tsParser from "@typescript-eslint/parser";
import parser from "svelte-eslint-parser";
import importPlugin from 'eslint-plugin-import';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export function generateConfig(tsconfigRootDir) {
    return defineConfig([
        globalIgnores(["**/generated/*.ts", "**/i18n-*.ts"]),
        eslint.configs.recommended,
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
        {
            languageOptions: {
                parserOptions: {
                    projectService: true,
                    tsconfigRootDir: tsconfigRootDir,
                },
                globals: {
                    ...globals.browser,
                    ...globals.node
                }
            }
        },
        //"plugin:import/recommended",
        //"plugin:import/typescript",
        //"plugin:rxjs/recommended",
        //"plugin:svelte/recommended",
        {
            files: ["**/*.svelte"],

            languageOptions: {
                parserOptions: {
                    projectService: true,
                    extraFileExtensions: ['.svelte'], // Add support for additional file extensions, such as .svelte
                    parser: tseslint.parser,
                    // Specify a parser for each language, if needed:
                    // parser: {
                    //   ts: ts.parser,
                    //   js: espree,    // Use espree for .js files (add: import espree from 'espree')
                    //   typescript: ts.parser
                    // },

                    // We recommend importing and specifying svelte.config.js.
                    // By doing so, some rules in eslint-plugin-svelte will automatically read the configuration and adjust their behavior accordingly.
                    // While certain Svelte settings may be statically loaded from svelte.config.js even if you don’t specify it,
                    // explicitly specifying it ensures better compatibility and functionality.
                    //svelteConfig
                }
            },
        },
        {
            files: [
                "{src,src-ui,tests}/**/*.ts",
                "{src,tests}/**/*.js",
                "{src,src-ui,tests}/**/*.svelte"
            ],
            ignores: [
                "**/generated/*.ts",
                "**/i18n/i18n-*.ts"
            ],

            languageOptions: {
                globals: {
                    /*...globals.browser,
                    ...globals.node,*/
                    Atomics: "readonly",
                    SharedArrayBuffer: "readonly",
                },

                //parser: tsParser,
                ecmaVersion: 2018,
                sourceType: "module",

                parserOptions: {
                    projectService: true,
                    tsconfigRootDir: import.meta.dirname,
                    project: "./tsconfig.json",
                    extraFileExtensions: [".svelte"],
                },
            },
        },
        {

            plugins: {
                //"@typescript-eslint": typescriptEslint,
                rxjs: rxjs,
                //"unused-imports": unusedImports,
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

                "@typescript-eslint/no-empty-function": "off",
                "@typescript-eslint/ban-ts-comment": ["error", {
                    'ts-ignore': 'allow-with-description',
                }],
                //"@typescript-eslint/ban-ts-ignore": "off",
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

                //"svelte/no-at-html-tags": "off",
                "import/default": "off",
                "import/no-named-as-default": "off",
                "import/no-named-as-default-member": "off",
                "svelte/no-ignored-unsubscribe": "error",
                //"unused-imports/no-unused-imports": "error",
            },
        }
    ]);
}
