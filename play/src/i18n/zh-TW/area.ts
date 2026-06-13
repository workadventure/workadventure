import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "抱歉，您無權存取此區域。",
    blocked: {
        locked: "此區域已鎖定。您無法進入。",
        maxUsers: "此區域已滿。您無法進入。",
        noAccess: "抱歉，您無權存取此區域。",
        unlockWithTrigger: "{trigger}以解鎖該區域。",
    },
    personalArea: {
        claimDescription: "這是一個個人區域。您想將其設為您的區域嗎？",
        buttons: {
            yes: "是",
            no: "否",
            confirm: "確認",
        },
        personalSpaceWithNames: "{name}的個人空間",
        alreadyHavePersonalArea: "您已有一個個人區域。如果您認領此區域，先前的將被刪除。",
    },
};

export default area;
