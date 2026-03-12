import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Personalitzar el vostre WOKA",
        navigation: {
            finish: "Acabar",
            backToDefaultWoka: "Tornar al WOKA per defecte",
        },
        randomize: "Aleatori",
    },
    selectWoka: {
        title: "Seleccionar el vostre WOKA",
        continue: "Continuar",
        customize: "Personalitzar el vostre WOKA",
        randomize: "Seleccionar aleatòriament",
    },
    menu: {
        businessCard: "Targeta de visita",
    },
};

export default woka;
