import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "Tłóč [X] abo tipuj tu, zo by webstronu wočinił",
    newTab: "Tłóč [X] abo tipuj tu, zo by webstronu w nowym tabje wočinił",
    jitsiRoom: "Tłóč [X] abo tipuj tu, zo by Jitsi Meet rumej přistupił",
    object: "Tłóč [X] abo tipuj tu, zo by z nim interagował 👀",
    interactKeyboard: "[X]",
    escapeKeyboard: "[ESC]",
    mobile: {
        cowebsite: "👆 zo by webstronu wočinił 👀",
        jitsiRoom: "👆 zo by do Jitsi přistupił 👀",
        newTab: "👆 zo by nowy tab wočinił 👀",
        object: "👆 zo by z nim interagował 👀",
    },
};

export default trigger;
