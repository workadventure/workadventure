import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const chat: DeepPartial<Translation["chat"]> = {
    intro: "Tu je twój wotběh powěsćow:",
    enter: "Spisaj swoju powěsć...",
    menu: {
        visitCard: "Wizitka",
        addFriend: "přećelku/a přidać",
    },
    typing: "tipuje...",
};

export default chat;
