import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Crea il tuo WOKA",
        navigation: {
            finish: "Finisci",
            backToDefaultWoka: "Torna al WOKA predefinito",
        },
        randomize: "Casuale",
    },
    selectWoka: {
        title: "Seleziona il tuo WOKA",
        continue: "Continua",
        customize: "Crea il tuo WOKA",
        randomize: "Seleziona casualmente",
    },
    menu: {
        businessCard: "Biglietto da visita",
    },
};

export default woka;
