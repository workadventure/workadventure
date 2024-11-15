import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Bouw je WOKA",
        navigation: {
            return: "Terug",
            back: "Vorige",
            finish: "Voltooien",
            next: "Volgende",
            backTodefaultWoka: "Terug naar standaard WOKA",
        },
    },
    selectWoka: {
        title: "Selecteer je WOKA",
        continue: "Doorgaan",
        customize: "Bouw je WOKA",
    },
    menu: {
        businessCard: "Visitekaartje",
    },
};

export default woka;
