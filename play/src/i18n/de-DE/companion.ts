import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Wähle einen Begleiter",
        any: "Kein Begleiter",
        continue: "Weiter",
    },
};

export default companion;
