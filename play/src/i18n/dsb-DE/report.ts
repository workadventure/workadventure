import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "Blokěrowanje",
        content: "Blokěruj kuždu komunikaciju z wužywarjom {userName}. Ta opcija móžo se kuždy cas zasej anulěrowaś.",
        unblock: "Blokěrowanje togo wužywarja zasej anulěrowaś",
        block: "Blokěruj togo wužywarja",
    },
    title: "Mjeldowanje",
    content: "Napiš powěsć administratoram teje śpy. Wóni mógu togo wužywarja blokěrowaś.",
    message: {
        title: "Twója powěsć: ",
        empty: "To pólo njesmějo byś prozne.",
        error: "Dla zmólkow pśi mjeldowanju wobrośćo se na administratora.",
    },
    submit: "Togo wužywarja mjeldowaś",
    moderate: {
        title: "Moderěrowanje wužywarja {userName}",
        block: "Blokěrowanje",
        report: "Mjeldowanje",
        noSelect: "ZMÓLKA: Žedna akcije njejo wuzwólona.",
    },
};

export default report;
