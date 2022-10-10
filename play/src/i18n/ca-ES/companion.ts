import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Seleccioneu el vostre company",
        any: "Sense company",
        continue: "Continuar",
    },
};

export default companion;
