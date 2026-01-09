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
        personalSpaceWithNames: "Persoonlijke ruimte van {name}",
        alreadyHavePersonalArea: "Je hebt al een persoonlijk gebied. Het wordt verwijderd als je dit gebied claimt.",
    },
};

export default area;
