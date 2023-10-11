import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const chat: DeepPartial<Translation["chat"]> = {
    intro: "How su twóje powěsći:",
    enter: "Napišćo powěsć...",
    menu: {
        visitCard: "Wizitna kórtka",
        addFriend: "Pśijaśela / pśijaśelku pśidaś",
    },
    typing: "pišo...",
};

export default chat;
