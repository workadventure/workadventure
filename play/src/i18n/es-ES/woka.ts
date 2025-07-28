import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Personalice su WOKA",
        navigation: {
            finish: "Acabar",
            backToDefaultWoka: "Volver al WOKA por defecto",
        },
        randomize: "Aleatorio",
    },
    selectWoka: {
        title: "Seleccionar su WOKA",
        continue: "Continuar",
        customize: "Personalizar su WOKA",
        randomize: "Seleccionar aleatoriamente",
    },
    menu: {
        businessCard: "Tarjeta de visita",
    },
};

export default woka;
