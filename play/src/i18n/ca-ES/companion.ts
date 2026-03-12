import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Seleccioneu el vostre company",
        any: "Sense company",
        continue: "Continuar",
    },
};

export default companion;
