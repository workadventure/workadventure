import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "仲間を選択",
        any: "仲間がいません",
        continue: "続ける",
    },
};

export default companion;
