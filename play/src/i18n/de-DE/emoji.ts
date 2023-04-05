import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const emoji: DeepPartial<Translation["emoji"]> = {
    search: "Emojis suchen...",
    categories: {
        recents: "Letzte Emojis",
        smileys: "Smileys & Emotionen",
        people: "Menschen",
        animals: "Tiere & Natur",
        food: "Essen & Trinken",
        activities: "Aktivitäten",
        travel: "Reisen & Orte",
        objects: "Objekte",
        symbols: "Symbole",
        flags: "Flaggen",
        custom: "Benutzerdefiniert",
    },
    notFound: "Keine Emojis gefunden",
};

export default emoji;
