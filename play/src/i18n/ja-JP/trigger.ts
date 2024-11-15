import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "[スペース] を押してウェブサイトを開きます 👀",
    jitsiRoom: "[スペース] を押して Jitsi ルームに入ります 👀",
    newTab: "[スペース] を押して新しいタブを開きます 👀",
    object: "[スペース] を押して対話します 👀",
    spaceKeyboard: "[スペース]",
    mobile: {
        cowebsite: "👆 でウェブサイトを開きます 👀",
        jitsiRoom: "👆 で Jitsi ルームに入ります 👀",
        newTab: "👆 で新しいタブを開きます 👀",
        object: "👆 で対話します 👀",
    },
};

export default trigger;
