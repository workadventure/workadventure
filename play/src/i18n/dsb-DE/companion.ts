import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Wuzwól pśewóźowarja",
        any: "Žeden pśewóźowaŕ njejo",
        continue: "Dalej",
    },
};

export default companion;
