import playwright from 'eslint-plugin-playwright'
import typescriptEslint from 'typescript-eslint'

export default [
    ...typescriptEslint.configs.recommended,
    playwright.configs['flat/recommended'],
    // Configuration spéciale pour ignorer les erreurs de parsing sur 'await using'
    {
        files: ["**/*.ts"],
        ignores: ["**/node_modules/**"],
        rules: {
            // Ignorer temporairement les erreurs de parsing liées à 'await using'
        }
    }
];
