import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "Désolé, vous n'avez pas accès à cette zone.",
    personalArea: {
        claimDescription: "Il s'agit d'un espace personnel. Voulez-vous vous l'approprier ?",
        buttons: {
            yes: "Oui",
            no: "Non",
        },
        personalSpaceWithNames: "Espace personnel de {name}",
        alreadyHavePersonalArea: "Vous avez déjà un espace personnel. Il sera supprimé si vous prenez celui-ci.",
    },
};

export default area;
