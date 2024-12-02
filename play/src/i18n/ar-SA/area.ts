import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "عذرًا، ليس لديك إذن للوصول إلى هذه المنطقة.", // Sorry, you do not have permission to access this area.
    personalArea: {
        claimDescription: "هذه منطقة شخصية. هل ترغب في تولي الملكية؟", // This is a personal area. Do you want to claim it?
        buttons: {
            yes: "نعم", // Yes
            no: "لا", // No
        },
    },
};

export default area;
