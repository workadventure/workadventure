import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "[X] pour ouvrir le site Web 👀",
    jitsiRoom: "[X] pour entrer dans Jitsi 👀",
    newTab: "[X] pour ouvrir un nouvel onglet 👀",
    object: "[X] pour interagir avec 👀",
    interactKeyboard: "[X]",
    escapeKeyboard: "[ÉCHAP]",
    mobile: {
        cowebsite: "👆 pour ouvrir le site Web 👀",
        jitsiRoom: "👆 pour entrer dans Jitsi 👀",
        newTab: "👆 pour ouvrir un nouvel onglet 👀",
        object: "👆 pour interagir avec 👀",
    },
};

export default trigger;
