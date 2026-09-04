import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "เลือกเพื่อนคู่หูของคุณ",
        any: "ไม่มีเพื่อนคู่หู",
        continue: "ดำเนินการต่อ",
    },
};

export default companion;
