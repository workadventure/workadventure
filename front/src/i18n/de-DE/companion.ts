import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Wähle einen Begleiter",
        any: "Kein Begleiter",
        continue: "Weiter",
    },
};

export default companion;
