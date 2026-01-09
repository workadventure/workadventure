import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "按空格键或点击这里打开网页",
    jitsiRoom: "按空格键或点击这里进入Jitsi Meet会议",
    newTab: "按空格键或点击这里在新标签打开网页",
    object: "按空格键或点击这里进行交互 👀",
    spaceKeyboard: "[空格]",
    mobile: {
        cowebsite: "👆 打开网页 👀",
        jitsiRoom: "👆 进入Jitsi 👀",
        newTab: "👆 打开新标签 👀",
        object: "👆 进行交互 👀",
    },
};

export default trigger;
