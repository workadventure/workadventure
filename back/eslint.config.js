import {generateConfig} from "@workadventure/eslint-config";

export default [
    ...generateConfig(import.meta.dirname),
    {
        rules: {
            // Custom rules for back goes here.
        }
    }
];
