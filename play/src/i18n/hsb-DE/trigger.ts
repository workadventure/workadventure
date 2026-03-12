import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "Tłóč LEERTASTE abo tipuj tu, zo by webstronu wočinił",
    newTab: "Tłóč LEERTASTE abo tipuj tu, zo by webstronu w nowym tabje wočinił",
    jitsiRoom: "Tłóč LEERTASTE abo tipuj tu, zo by Jitsi Meet rumej přistupił",
    object: "Tłóč LEERTASTE abo tipuj tu, zo by z nim interagował 👀",
    spaceKeyboard: "[LEERTASTE]",
    mobile: {
        cowebsite: "👆 zo by webstronu wočinił 👀",
        jitsiRoom: "👆 zo by do Jitsi přistupił 👀",
        newTab: "👆 zo by nowy tab wočinił 👀",
        object: "👆 zo by z nim interagował 👀",
    },
};

export default trigger;
