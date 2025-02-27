import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const emoji: DeepPartial<Translation["emoji"]> = {
    search: "Cerca emoji...",
    categories: {
        recents: "Emoji recenti",
        smileys: "Faccine & Emozioni",
        people: "Persone & Corpo",
        animals: "Animali & Natura",
        food: "Cibo & Bevande",
        activities: "Attività",
        travel: "Viaggi & Luoghi",
        objects: "Oggetti",
        symbols: "Simboli",
        flags: "Bandiere",
        custom: "Personalizzato",
    },
    notFound: "Nessun emoji trovato",
};

export default emoji;
