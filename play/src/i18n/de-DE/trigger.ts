import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: `[X] um die Webseite zu öffnen 👀`,
    jitsiRoom: "[X] um Jitsi zu betreten 👀",
    newTab: "[X] um neuen Tab zu öffnen 👀",
    object: "[X] um zu interagieren 👀",
    interactKeyboard: "[X]",
    escapeKeyboard: "[ESC]",
    mobile: {
        cowebsite: "👆 um die Webseite zu öffnen 👀",
        jitsiRoom: "👆 um Jitsi zu betreten 👀",
        newTab: "👆 um neuen Tab zu öffnen 👀",
        object: "👆 um zu interagieren 👀",
    },
};

export default trigger;
