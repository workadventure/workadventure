import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "Sorry, je hebt geen toegang tot dit gebied.",
    personalArea: {
        claimDescription: "Dit is een persoonlijk gebied. Wil je het van jou maken?",
        buttons: {
            yes: "Ja",
            no: "Nee",
        },
    },
};

export default area;
