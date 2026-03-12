import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "wuzwol sej towarša",
        any: "žadyn towarš",
        continue: "dale",
    },
};

export default companion;
