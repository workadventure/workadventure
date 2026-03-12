import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "Wódaj, njamatej pśistup k toś tomu wobcerjeju.",
    personalArea: {
        claimDescription: "To jo wósobinske wobcerje. Cośo jen swój cyniś?",
        buttons: {
            yes: "Jo",
            no: "Ně",
        },
        personalSpaceWithNames: "Wósobinski rum {name}",
        alreadyHavePersonalArea: "Maśo južo wósobinske wobcerje. Buźo se wulašowaś, jolic toś to wobcerje pśewześo.",
    },
};

export default area;
