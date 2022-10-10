import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Dein WOKA bearbeiten",
        navigation: {
            return: "Zurück",
            back: "Hoch",
            finish: "Auswählen",
            next: "Runter",
        },
    },
    selectWoka: {
        title: "Dein WOKA auswählen",
        continue: "Auswählen",
        customize: "Bearbeite dein WOKA",
    },
    menu: {
        businessCard: "Visitenkarte",
    },
};

export default woka;
