import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: `[X] per aprire il sito web 👀`,
    jitsiRoom: "[X] per entrare in Jitsi 👀",
    newTab: "[X] per aprire una nuova scheda 👀",
    object: "[X] per interagire con esso 👀",
    interactKeyboard: "[X]",
    escapeKeyboard: "[ESC]",
    mobile: {
        cowebsite: "👆 per aprire il sito web 👀",
        jitsiRoom: "👆 per entrare in Jitsi 👀",
        newTab: "👆 per aprire una nuova scheda 👀",
        object: "👆 per interagire con esso 👀",
    },
};

export default trigger;
