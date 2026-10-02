import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "選擇你的夥伴",
        any: "沒有夥伴",
        continue: "繼續",
    },
};

export default companion;
