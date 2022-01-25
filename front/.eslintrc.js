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
        "svelte3",
    ],
    "overrides": [
        {
          "files": ["*.svelte"],
          "processor": "svelte3/svelte3"
        }
    ],
    "rules": {
        "no-unused-vars": "off",
        "eol-last": ["error", "always"],
        "@typescript-eslint/no-explicit-any": "error",
        "no-throw-literal": "error",
        // TODO: remove those ignored rules and write a stronger code!
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/restrict-plus-operands": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
    },
    "settings": {
        "svelte3/typescript": true,
        "svelte3/ignore-styles": () => true
    }
}
