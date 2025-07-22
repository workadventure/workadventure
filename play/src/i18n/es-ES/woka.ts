import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Personalice su WOKA",
        navigation: {
            return: "Volver",
            back: "Atrás",
            finish: "Acabar",
            next: "Siguiente",
        },
    },
    selectWoka: {
        title: "Seleccionar su WOKA",
        continue: "Continuar",
        customize: "Personalizar su WOKA",
    },
    menu: {
        businessCard: "Tarjeta de visita",
    },
};

export default woka;
