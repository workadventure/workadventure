import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const companion: DeepPartial<Translation["companion"]> = {
    select: {
        title: "اختر رفيقًا", // Choose a companion
        any: "لا رفيق", // No companion
        continue: "استمر", // Continue
    },
};
export default companion;
