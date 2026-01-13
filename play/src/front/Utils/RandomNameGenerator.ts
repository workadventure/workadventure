import { get } from "svelte/store";
import { LL } from "../../i18n/i18n-svelte";

/**
 * Generates a random fun name composed of two parts, adapted to the current locale
 * Uses the i18n system to get name parts from translation files
 * @returns A random name composed of two parts
 */
export function generateRandomName(): string {
    // Get the current locale from the store
    const currentLL = get(LL);

    // Access the randomNames from the i18n system
    const adjectives = currentLL.randomNames.adjectives as unknown as Record<string, () => string>;
    const names = currentLL.randomNames.names as unknown as Record<string, () => string>;

    // Get keys from the objects
    const adjectivesKeys = Object.keys(adjectives);
    const nameKeys = Object.keys(names);

    if (!adjectives || !names || adjectivesKeys.length === 0 || nameKeys.length === 0) {
        // Fallback to English if translation is missing
        console.warn("Random names not available in current locale, using fallback");
        return "Guest";
    }

    const randomAdjectiveKey = adjectivesKeys[Math.floor(Math.random() * adjectivesKeys.length)];
    const randomNameKey = nameKeys[Math.floor(Math.random() * nameKeys.length)];

    const adjective = adjectives[randomAdjectiveKey]();
    const name = names[randomNameKey]();

    return currentLL.randomNames.template({ adjective, name });
}
