import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Seleccione su compañero",
        any: "Sin compañero",
        continue: "Continuar",
    },
};

export default companion;
