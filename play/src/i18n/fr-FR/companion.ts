import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Sélectionnez votre compagnon",
        any: "Pas de compagnon",
        continue: "Continuer",
    },
};

export default companion;
