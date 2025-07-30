import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Bearbeite deinen WOKA",
        navigation: {
            finish: "Fertig",
            backToDefaultWoka: "Zurück zum Standard-WOKA",
        },
        randomize: "Zufällig auswählen",
    },
    selectWoka: {
        title: "Deinen WOKA auswählen",
        continue: "Weiter",
        customize: "Bearbeite deinen WOKA",
        randomize: "Zufällig auswählen",
    },
    menu: {
        businessCard: "Visitenkarte",
    },
};

export default woka;
