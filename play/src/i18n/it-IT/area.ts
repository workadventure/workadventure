import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "Spiacente, non hai accesso a quest'area.",
    personalArea: {
        claimDescription: "Questa è un'area personale. Vuoi farla tua?",
        buttons: {
            yes: "Sì",
            no: "No",
        },
        personalSpaceWithNames: "Spazio personale di {name}",
        alreadyHavePersonalArea: "Hai già un'area personale. Verrà eliminata se reclami questa.",
    },
};

export default area;
