import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const chat: DeepPartial<Translation["chat"]> = {
    intro: "Aquí está su histórico del chat:",
    enter: "Escriba su mensaje...",
    menu: {
        visitCard: "Tarjeta de visita",
        addFriend: "Añadir amigo",
    },
    typing: "està escrivint...",
};

export default chat;
