import {generateConfig} from "@workadventure/eslint-config";

export default [
    ...generateConfig(import.meta.dirname),
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



            // Uncomment this to detect circular dependencies in imports
            // It is slow (~7 minutes) but is really helpful to detect architectural issues
            // TODO: solve these issues one by one and then enable this rule in CI only
            //"import/no-cycle": [2, { "maxDepth": 5, "ignoreExternal": true }],
        }
    }
];
