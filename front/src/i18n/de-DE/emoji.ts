import type { Translation } from "../i18n-types";

const emoji: NonNullable<Translation["emoji"]> = {
    search: "Emojis suchen...",
    categories: {
        recents: "Letzte Emojis",
        smileys: "Smileys & Emotionen",
        people: "Menschen",
        animals: "Tiere & Natur",
        food: "Essen & Trinken",
        activities: "Aktivitäten",
        travel: "Reise & Orte",
        objects: "Objekte",
        symbols: "Symbole",
        flags: "Flaggen",
        custom: "Benutzerdefinier",
    },
    notFound: "Keine Emojis gefunden",
};

export default emoji;
