import { DeepPartial } from "../../Utils/DeepPartial";
import type { Translation } from "../i18n-types";

const chat: DeepPartial<Translation["chat"]> = {
    intro: "Hier ist dein Nachrichtenverlauf:",
    enter: "Verfasse deine Nachricht...",
    menu: {
        visitCard: "Visitenkarte",
        addFriend: "Freund*In hinzufügen",
    },
    typing: "tippt...",
};

export default chat;
