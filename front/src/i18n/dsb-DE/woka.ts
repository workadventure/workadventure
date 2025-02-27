import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Swój WOKA wobźěłaś",
        navigation: {
            return: "Slědk",
            back: "Górjej",
            finish: "Wuzwóliś",
            next: "Dołoj",
        },
    },
    selectWoka: {
        title: "Swój WOKA wuzwóliś",
        continue: "Wuzwóliś",
        customize: "Wobźěłaj swój WOKA",
    },
    menu: {
        businessCard: "Wizitna kórtka",
    },
};

export default woka;
