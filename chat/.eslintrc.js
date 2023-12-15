module.exports = {
    "root": true,
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:import/recommended",
        "plugin:import/typescript",
        "plugin:rxjs/recommended",
        "plugin:svelte/recommended",
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module",
        "project": "./tsconfig.json",
        "extraFileExtensions": [".svelte"]
    },
    "plugins": [
        "@typescript-eslint",
        "rxjs",
    ],
    "overrides": [
        {
            "files": ["*.svelte"],
            "parser": "svelte-eslint-parser",
            "parserOptions": {
                "parser": '@typescript-eslint/parser'
            }
        }
    ],
    "rules": {
        "no-unused-vars": "off",
        "eol-last": ["error", "always"],
        "@typescript-eslint/no-explicit-any": "error",
        "no-throw-literal": "error",
        "@typescript-eslint/no-unused-vars": ["error", { "args": "none", "caughtErrors": "all", "varsIgnorePattern": "_exhaustiveCheck" }],
        // TODO: remove those ignored rules and write a stronger code!
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/restrict-plus-operands": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "import/order": "error",

        "no-async-promise-executor": "error",
        "no-await-in-loop": "error",
        "no-promise-executor-return": "error",
        "require-atomic-updates": "error",
        "prefer-promise-reject-errors": "error",

        "rxjs/no-ignored-subscription": "error",

        "svelte/require-each-key": "error",
        "svelte/valid-compile": [ "error", { 'ignoreWarnings': true } ],
        "svelte/no-ignored-unsubscribe": "error",
    },
    "settings": {
        "typescript": true,
        "node": true,
    }
}
