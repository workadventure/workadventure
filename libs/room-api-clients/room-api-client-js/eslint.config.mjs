import {generateConfig} from "@workadventure/eslint-config";
import {globalIgnores} from "eslint/config";

export default [
    globalIgnores(['src/compiled_proto/**', 'dist/**', 'node_modules/**']),
    ...generateConfig(import.meta.dirname),
    {
        rules: {
            // Custom rules for package goes here.
        }
    }
];
