import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Seleccione su compañero",
        any: "Sin compañero",
        continue: "Continuar",
    },
};

export default companion;
