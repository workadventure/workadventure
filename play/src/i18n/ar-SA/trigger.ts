import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: `[X] لفتح الموقع الإلكتروني 👀`, // [X] to open the website 👀
    jitsiRoom: `[X] لدخول جتي سي 👀`, // [X] to enter Jitsi 👀
    newTab: `[X] لفتح تبويب جديد 👀`, // [X] to open a new tab 👀
    object: `[X] للتفاعل 👀`, // [X] to interact 👀
    interactKeyboard: `[X]`,
    escapeKeyboard: `[ESC]`,
    mobile: {
        cowebsite: "👆 لفتح الموقع الإلكتروني 👀", // 👆 to open the website 👀
        jitsiRoom: "👆 لدخول جتي سي 👀", // 👆 to enter Jitsi 👀
        newTab: "👆 لفتح تبويب جديد 👀", // 👆 to open a new tab 👀
        object: "👆 للتفاعل 👀", // 👆 to interact 👀
    },
};

export default trigger;
