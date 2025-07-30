import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Bouw je WOKA",
        navigation: {
            finish: "Voltooien",
            backToDefaultWoka: "Terug naar standaard WOKA",
        },
        randomize: "Willekeurig",
    },
    selectWoka: {
        title: "Selecteer je WOKA",
        continue: "Doorgaan",
        customize: "Bouw je WOKA",
        randomize: "Willekeurig",
    },
    menu: {
        businessCard: "Visitekaartje",
    },
};

export default woka;
