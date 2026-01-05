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
    const firstParts = currentLL.randomNames.firstParts as unknown as Record<string, () => string>;
    const secondParts = currentLL.randomNames.secondParts as unknown as Record<string, () => string>;

    // Convert firstParts to array from object and get the length
    const firstPartsArray = Object.values(firstParts);
    const secondPartsArray = Object.values(secondParts);

    if (!firstParts || !secondParts || firstPartsArray.length === 0 || secondPartsArray.length === 0) {
        // Fallback to English if translation is missing
        console.warn("Random names not available in current locale, using fallback");
        return "Guest";
    }

    const firstPart = firstParts[Math.floor(Math.random() * firstPartsArray.length)]();
    const secondPart = secondParts[Math.floor(Math.random() * secondPartsArray.length)]();
    return `${firstPart} ${secondPart}`;
}
