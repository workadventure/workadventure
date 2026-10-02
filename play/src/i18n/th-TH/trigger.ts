import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "[SPACE] เพื่อเปิดเว็บไซต์ 👀",
    jitsiRoom: "[SPACE] เพื่อเข้าร่วม Jitsi 👀",
    newTab: "[SPACE] เพื่อเปิดแท็บใหม่ 👀",
    object: "[SPACE] เพื่อโต้ตอบ 👀",
    spaceKeyboard: "[SPACE]",
    escapeKeyboard: "[ESCAPE]",
    mobile: {
        cowebsite: "👆 เพื่อเปิดเว็บไซต์ 👀",
        jitsiRoom: "👆 เพื่อเข้าร่วม Jitsi 👀",
        newTab: "👆 เพื่อเปิดแท็บใหม่ 👀",
        object: "👆 เพื่อโต้ตอบ 👀",
    },
};

export default trigger;
