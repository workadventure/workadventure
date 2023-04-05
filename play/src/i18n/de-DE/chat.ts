import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const chat: DeepPartial<Translation["chat"]> = {
    intro: "Hier ist dein Nachrichtenverlauf:",
    enter: "Geben Sie Ihre Nachricht ein...",
    menu: {
        visitCard: "Visitenkarte",
        addFriend: "Freund*in hinzufügen",
    },
    typing: "schreibt...",
};

export default chat;
