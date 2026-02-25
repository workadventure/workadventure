import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "عذرًا، ليس لديك إذن للوصول إلى هذه المنطقة.", // Sorry, you do not have permission to access this area.
    blocked: {
        locked: "هذه المنطقة مقفلة. لا يمكنك الدخول.",
        maxUsers: "هذه المنطقة ممتلئة. لا يمكنك الدخول.",
        noAccess: "عذرًا، ليس لديك إذن للوصول إلى هذه المنطقة.",
        unlockWithTrigger: "{trigger} لفتح هذه المنطقة.",
    },
    personalArea: {
        claimDescription: "هذه منطقة شخصية. هل ترغب في تولي الملكية؟", // This is a personal area. Do you want to claim it?
        buttons: {
            yes: "نعم", // Yes
            no: "لا", // No
        },
        personalSpaceWithNames: "المساحة الشخصية لـ {name}",
        alreadyHavePersonalArea: "لديك بالفعل منطقة شخصية. سيتم حذفها إذا طالبت بهذه المنطقة.",
    },
};

export default area;
