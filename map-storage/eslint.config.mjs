import {generateConfig} from "@workadventure/eslint-config";
import {globalIgnores} from "eslint/config";

export default [
    globalIgnores(["**/tests/assets/**"]),
    ...generateConfig(import.meta.dirname),
    {
        rules: {
            // Custom rules for map-storage goes here.
            '@typescript-eslint/interface-name-prefix': 'off',
        }
    }
];
