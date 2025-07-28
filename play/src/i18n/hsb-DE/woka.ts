import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "twój WOKA wobdźěłać",
        navigation: {
            finish: "wubrać",
            backToDefaultWoka: "wróćo k WOKA za pśepokład",
        },
        randomize: "Losowo",
    },
    selectWoka: {
        title: "twój WOKA wuzwolić",
        continue: "wubrać",
        customize: "wobdźěłaj swój WOKA",
        randomize: "Losowo",
    },
    menu: {
        businessCard: "wizitka",
    },
};

export default woka;
