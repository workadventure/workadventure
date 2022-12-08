import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "blokować",
        content: "blokuj kóždužkuli komunikaciju z {userName}. Móže so kóždy čas cofnyć. ",
        unblock: "blokowanje za tutoho wužiwarja zběhnyć",
        block: "blokuj tutoho wužiwarja",
    },
    title: "přizjewić",
    content: "Napisaj pohóršk na administratorow tutoho ruma. Tući móža wužiwarja po tym wuzamknyć. ",
    message: {
        title: "Twoja powěsć:",
        empty: "prošu tekst zapodać.",
    },
    submit: "tutoho wužiwarja přizjewić",
    moderate: {
        title: "{userName} moderěrować",
        block: "blokować",
        report: "přizjewić",
        noSelect: "ZMYLK: Njeje žane jednanje wuzwolene.",
    },
};

export default report;
