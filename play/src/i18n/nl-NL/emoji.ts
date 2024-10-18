import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const emoji: DeepPartial<Translation["emoji"]> = {
    search: "Zoek emoji's...",
    categories: {
        recents: "Recente Emoji's",
        smileys: "Smileys & Emotie",
        people: "Mensen & Lichaam",
        animals: "Dieren & Natuur",
        food: "Eten & Drinken",
        activities: "Activiteiten",
        travel: "Reizen & Plaatsen",
        objects: "Objecten",
        symbols: "Symbolen",
        flags: "Vlaggen",
        custom: "Aangepast",
    },
    notFound: "Geen emoji's gevonden",
};

export default emoji;
