import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const chat: DeepPartial<Translation["chat"]> = {
    intro: "Voici l'historique de votre chat:",
    enter: "Entrez votre message...",
    menu: {
        visitCard: "Carte de visite",
        addFriend: "Ajouter un ami",
    },
    typing: "est en train d'écire...",
};

export default chat;
