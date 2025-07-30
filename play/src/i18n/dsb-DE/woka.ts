import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Swój WOKA wobźěłaś",
        navigation: {
            finish: "Wuzwóliś",
            backToDefaultWoka: "Do WOKA za pśepokład",
        },
        randomize: "Losowo",
    },
    selectWoka: {
        title: "Swój WOKA wuzwóliś",
        continue: "Wuzwóliś",
        customize: "Wobźěłaj swój WOKA",
        randomize: "Losowo",
    },
    menu: {
        businessCard: "Wizitna kórtka",
    },
};

export default woka;
