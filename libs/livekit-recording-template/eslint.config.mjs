import { generateConfig } from "@workadventure/eslint-config";
import { globalIgnores } from "eslint/config";

export default [
    globalIgnores(["dist/**", "node_modules/**"]),
    ...generateConfig(import.meta.dirname),
    {
        files: ["src/**/*.{ts,tsx}"],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
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
        },
    },
];
