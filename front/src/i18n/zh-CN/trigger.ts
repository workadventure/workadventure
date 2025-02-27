import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "按空格键或点击这里打开网页",
    jitsiRoom: "按空格键或点击这里进入Jitsi Meet会议",
    newTab: "按空格键或点击这里在新标签打开网页",
};

export default trigger;
