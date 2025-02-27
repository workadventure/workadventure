import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Bearbeite deinen WOKA",
        navigation: {
            return: "Zurückkehren",
            back: "Zurück",
            finish: "Fertig",
            next: "Weiter",
            backTodefaultWoka: "Zurück zum Standard-WOKA",
        },
    },
    selectWoka: {
        title: "Deinen WOKA auswählen",
        continue: "Weiter",
        customize: "Bearbeite deinen WOKA",
    },
    menu: {
        businessCard: "Visitenkarte",
    },
};

export default woka;
