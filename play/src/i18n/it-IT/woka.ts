import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Crea il tuo WOKA",
        navigation: {
            return: "Ritorna",
            back: "Indietro",
            finish: "Finisci",
            next: "Avanti",
            backTodefaultWoka: "Torna al WOKA predefinito",
        },
    },
    selectWoka: {
        title: "Seleziona il tuo WOKA",
        continue: "Continua",
        customize: "Crea il tuo WOKA",
    },
    menu: {
        businessCard: "Biglietto da visita",
    },
};

export default woka;
