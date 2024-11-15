import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Seleziona il tuo compagno",
        any: "Nessun compagno",
        continue: "Continua",
    },
};

export default companion;
