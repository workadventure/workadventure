import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "抱歉，您无权访问此区域。",
    personalArea: {
        claimDescription: "这是一个个人区域。您想将其设为您的区域吗？",
        buttons: {
            yes: "是",
            no: "否",
        },
        personalSpaceWithNames: "{name}的个人空间",
        alreadyHavePersonalArea: "您已有一个个人区域。如果您认领此区域，之前的将被删除。",
    },
};

export default area;
