import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Selecione seu companheiro",
        any: "Sem companheiro",
        continue: "Continuar",
    },
};

export default companion;
