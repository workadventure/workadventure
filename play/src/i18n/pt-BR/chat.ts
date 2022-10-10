import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const chat: DeepPartial<Translation["chat"]> = {
    intro: "Aqui está seu histórico de bate-papo:",
    enter: "Digite sua mensagem...",
    menu: {
        visitCard: "Cartão de visita",
        addFriend: "Adicionar amigo",
    },
    typing: "está digitando...",
};

export default chat;
