import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "Lo siento, no tienes acceso a esta zona.",
    personalArea: {
        claimDescription: "Esta es una zona personal. ¿Quieres hacerla tuya?",
        buttons: {
            yes: "Sí",
            no: "No",
        },
        personalSpaceWithNames: "Espacio personal de {name}",
        alreadyHavePersonalArea: "Ya tienes una zona personal. Se eliminará si reclamas esta.",
    },
};

export default area;
