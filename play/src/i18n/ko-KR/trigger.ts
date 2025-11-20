import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: `[SPACE]를 눌러 웹사이트 열기 👀`,
    jitsiRoom: "[SPACE]를 눌러 Jitsi 입장 👀",
    newTab: "[SPACE]를 눌러 새 탭 열기 👀",
    object: "[SPACE]를 눌러 상호작용 👀",
    spaceKeyboard: "[SPACE]",
    mobile: {
        cowebsite: "👆 탭하여 웹사이트 열기 👀",
        jitsiRoom: "👆 탭하여 Jitsi 입장 👀",
        newTab: "👆 탭하여 새 탭 열기 👀",
        object: "👆 탭하여 상호작용 👀",
    },
};

export default trigger;
