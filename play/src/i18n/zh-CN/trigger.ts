import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "按[X]或点击这里打开网页",
    jitsiRoom: "按[X]或点击这里进入Jitsi Meet会议",
    newTab: "按[X]或点击这里在新标签打开网页",
    object: "按[X]或点击这里进行交互 👀",
    interactKeyboard: "[X]",
    escapeKeyboard: "[Esc]",
    mobile: {
        cowebsite: "👆 打开网页 👀",
        jitsiRoom: "👆 进入Jitsi 👀",
        newTab: "👆 打开新标签 👀",
        object: "👆 进行交互 👀",
    },
};

export default trigger;
