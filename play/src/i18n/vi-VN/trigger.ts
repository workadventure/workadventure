import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "[PHÍM CÁCH] để mở trang web 👀",
    jitsiRoom: "[PHÍM CÁCH] để vào Jitsi 👀",
    newTab: "[PHÍM CÁCH] để mở thẻ mới 👀",
    object: "[PHÍM CÁCH] để tương tác 👀",
    spaceKeyboard: "[PHÍM CÁCH]",
    escapeKeyboard: "[ESC]",
    mobile: {
        cowebsite: "👆 để mở trang web 👀",
        jitsiRoom: "👆 để vào Jitsi 👀",
        newTab: "👆 để mở thẻ mới 👀",
        object: "👆 để tương tác 👀",
    },
};

export default trigger;
