import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "죄송합니다. 이 영역에 접근할 수 없습니다.",
    personalArea: {
        claimDescription: "개인 영역입니다. 소유하시겠습니까?",
        buttons: {
            yes: "예",
            no: "아니오",
        },
        personalSpaceWithNames: "{name}님의 개인 공간",
        alreadyHavePersonalArea: "이미 개인 영역이 있습니다. 이것을 소유하면 기존 영역이 삭제됩니다.",
    },
};

export default area;
