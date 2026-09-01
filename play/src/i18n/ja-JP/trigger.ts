import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "[X] を押してウェブサイトを開きます 👀",
    jitsiRoom: "[X] を押して Jitsi ルームに入ります 👀",
    newTab: "[X] を押して新しいタブを開きます 👀",
    object: "[X] を押して対話します 👀",
    interactKeyboard: "[X]",
    escapeKeyboard: "[Esc]",
    mobile: {
        cowebsite: "👆 でウェブサイトを開きます 👀",
        jitsiRoom: "👆 で Jitsi ルームに入ります 👀",
        newTab: "👆 で新しいタブを開きます 👀",
        object: "👆 で対話します 👀",
    },
};

export default trigger;
