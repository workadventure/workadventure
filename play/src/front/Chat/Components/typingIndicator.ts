export type TypingPart = { name: string } | { text: string };

const MAX_NAME_LENGTH = 16;
const NAMES_SLOT = "\u0000";

export function truncateName(name: string): string {
    return name.length > MAX_NAME_LENGTH ? `${name.slice(0, MAX_NAME_LENGTH - 1)}…` : name;
}

/**
 * "Bob is typing", "Bob and Alice are typing", "Bob, Alice and 2 others are typing". The names stay separate parts, to
 * be set in bold; `sentence` gets a placeholder for the list, so that each language puts it where it belongs.
 */
export function typingParts(
    names: readonly string[],
    locale: string,
    sentence: (count: number, names: string) => string,
    others: (count: number) => string,
): TypingPart[] {
    if (names.length === 0) {
        return [];
    }
    const shown = (names.length > 3 ? names.slice(0, 2) : names).map(truncateName);
    const items = names.length > 3 ? [...shown, others(names.length - 2)] : shown;
    let element = 0;
    const list = new Intl.ListFormat(locale, { style: "long", type: "conjunction" })
        .formatToParts(items)
        .map(
            (part): TypingPart =>
                part.type === "element" && element++ < shown.length ? { name: part.value } : { text: part.value },
        );
    const [before = "", after = ""] = sentence(names.length, NAMES_SLOT).split(NAMES_SLOT);
    return [{ text: before }, ...list, { text: after }].filter((part) => "name" in part || part.text !== "");
}
