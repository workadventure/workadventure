import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "仲間を選択",
        any: "仲間がいません",
        continue: "続ける",
    },
};

export default companion;
