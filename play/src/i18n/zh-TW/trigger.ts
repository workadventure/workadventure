import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "按空白鍵或點選這裡開啟網頁",
    jitsiRoom: "按空白鍵或點選這裡進入 Jitsi Meet 會議",
    newTab: "按空白鍵或點選這裡在新分頁開啟網頁",
    object: "按空白鍵或點選這裡進行互動 👀",
    spaceKeyboard: "[空白鍵]",
    escapeKeyboard: "[Esc]",
    mobile: {
        cowebsite: "👆 開啟網頁 👀",
        jitsiRoom: "👆 進入 Jitsi 👀",
        newTab: "👆 開啟新分頁 👀",
        object: "👆 進行互動 👀",
    },
};

export default trigger;
