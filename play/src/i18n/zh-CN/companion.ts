import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "选择你的伙伴",
        any: "没有伙伴",
        continue: "继续",
    },
};

export default companion;
