import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const arabicTranslations: DeepPartial<Translation["cowebsite"]> = {
    open: "افتح", // open
    close: "أغلق", // close
};

Object.assign(companion, arabicTranslations);
export default companion;
