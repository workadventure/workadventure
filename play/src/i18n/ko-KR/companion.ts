import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "동반자를 선택하세요",
        any: "동반자 없음",
        continue: "계속하기",
    },
};

export default companion;
