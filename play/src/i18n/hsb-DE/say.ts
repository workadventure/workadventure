import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "Rěkać",
        think: "Myslić",
    },
    placeholder: "Zapodajće tu wašu powěsć...",
    button: "Bublinu wutworić",
    tooltip: {
        description: {
            say: "Pokazuje chatowu bublinu nad wašim wotgłosom. Widźomna za wšěch na karcie, wostawa 5 sekundow pokazana.",
            think: "Pokazuje myslowu bublinu nad wašim wotgłosom. Widźomna za wšěch hrajerjow na karcie, wostawa pokazana, dźělaž so njepjerědujeće.",
        },
    },
};

export default say;
