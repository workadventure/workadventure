import type { Translation } from "../i18n-types";

const chat: NonNullable<Translation["chat"]> = {
    intro: "Voici l'historique de votre chat:",
    enter: "Entrez votre message...",
    menu: {
        visitCard: "Carte de visite",
        addFriend: "Ajouter un ami",
    },
    waitingTranslation: "Traduction en cours...",
};

export default chat;
