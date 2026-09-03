import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "Chọn thú đồng hành của bạn",
        any: "Không có thú đồng hành",
        continue: "Tiếp tục",
    },
};

export default companion;
