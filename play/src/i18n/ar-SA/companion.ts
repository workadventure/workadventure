import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "اختر رفيقًا", // Choose a companion
        any: "لا رفيق", // No companion
        continue: "استمر", // Continue
    },
};
export default companion;
