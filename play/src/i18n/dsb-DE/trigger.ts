import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "Tłoc [X] abo pótusni how, aby se wótcynił webbok",
    newTab: "Tłoc [X] abo pótusni how, aby webbok se wótcynił we nowem tabje",
    jitsiRoom: "Tłoc [X] abo pótusni how, aby stupił do Jitsi-Meet-śpy",
    object: "Tłoc [X] abo pótusni how, aby z nim interagował 👀",
    interactKeyboard: "[X]",
    escapeKeyboard: "[ESC]",
    mobile: {
        cowebsite: "👆 aby se wótcynił webbok 👀",
        jitsiRoom: "👆 aby stupił do Jitsi 👀",
        newTab: "👆 aby se wótcynił nowy tab 👀",
        object: "👆 aby z nim interagował 👀",
    },
};

export default trigger;
