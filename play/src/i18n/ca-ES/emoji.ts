import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const emoji: DeepPartial<Translation["emoji"]> = {
    search: "Cercar emojis...",
    categories: {
        recents: "Emojis recents",
        smileys: "Smileys & emocions",
        people: "Gent & cos",
        animals: "Animals & natura",
        food: "Menjar & begudes",
        activities: "Activitats",
        travel: "Viatges & llocs",
        objects: "Objectes",
        symbols: "Símbols",
        flags: "Banderes",
        custom: "Personalitzat",
    },
    notFound: "No s'han trobat emojis",
};

export default emoji;
