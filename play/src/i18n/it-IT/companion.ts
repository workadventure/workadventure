import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Seleziona il tuo compagno",
        any: "Nessun compagno",
        continue: "Continua",
    },
};

export default companion;
