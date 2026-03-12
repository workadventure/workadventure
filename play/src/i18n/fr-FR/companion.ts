import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Sélectionnez votre compagnon",
        any: "Pas de compagnon",
        continue: "Continuer",
    },
};

export default companion;
