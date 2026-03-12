import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Selecione seu companheiro",
        any: "Sem companheiro",
        continue: "Continuar",
    },
};

export default companion;
