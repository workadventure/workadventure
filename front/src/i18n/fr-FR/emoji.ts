import type { Translation } from "../i18n-types";

const emoji: NonNullable<Translation["emoji"]> = {
    search: "Chercher un emoji...",
    categories: {
        recents: "Emojis récents",
        smileys: "Smileys & emotions",
        people: "Personne & corps",
        animals: "Animaux & nature",
        food: "Nourriture & boissons",
        activities: "Activités",
        travel: "Voyage & endroits",
        objects: "Objets",
        symbols: "Symbols",
        flags: "Drapeaux",
        custom: "Personalisés",
    },
    notFound: "Aucun emoji trouvé",
};

export default emoji;
