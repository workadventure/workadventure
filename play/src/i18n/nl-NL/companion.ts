import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Selecteer je metgezel",
        any: "Geen metgezel",
        continue: "Doorgaan",
    },
};

export default companion;
