import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "죄송하지만 이 영역에 접근할 수 없습니다.",
    personalArea: {
        claimDescription: "개인 영역입니다. 이 영역을 나만의 공간으로 만들까요?",
        buttons: {
            yes: "예",
            no: "아니요",
        },
        personalSpaceWithNames: "{name}님의 개인 공간",
        alreadyHavePersonalArea: "이미 개인 영역을 가지고 있습니다. 이 영역을 선택하면 기존 개인 영역은 삭제됩니다.",
    },
};

export default area;
