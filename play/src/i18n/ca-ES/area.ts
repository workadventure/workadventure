import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "Ho sentim, no tens accés a aquesta àrea.",
    blocked: {
        locked: "Aquesta àrea està bloquejada. No pots entrar.",
        maxUsers: "Aquesta àrea està plena. No pots entrar.",
        noAccess: "Ho sentim, no tens accés a aquesta àrea.",
        unlockWithTrigger: "{trigger} per desbloquejar aquesta àrea.",
    },
    personalArea: {
        claimDescription: "Aquesta és una àrea personal. Vols fer-la teva?",
        buttons: {
            yes: "Sí",
            no: "No",
        },
        personalSpaceWithNames: "Espai personal de {name}",
        alreadyHavePersonalArea: "Ja tens una àrea personal. S'eliminarà si reclames aquesta.",
    },
};

export default area;
