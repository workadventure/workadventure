import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const chat: DeepPartial<Translation["chat"]> = {
    intro: "Aquí està el vostre històric del chat:",
    enter: "Escribiu el vostre missatge...",
    menu: {
        visitCard: "Targeta de visita",
        addFriend: "Afegir amic",
    },
    typing: "esta escribiendo...",
};

export default chat;
