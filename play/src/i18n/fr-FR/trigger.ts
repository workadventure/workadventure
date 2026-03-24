import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "[ESPACE] pour ouvrir le site Web 👀",
    jitsiRoom: "[ESPACE] pour entrer dans Jitsi 👀",
    newTab: "[ESPACE] pour ouvrir un nouvel onglet 👀",
    object: "[ESPACE] pour interagir avec 👀",
    spaceKeyboard: "[ESPACE]",
    escapeKeyboard: "[ÉCHAP]",
    mobile: {
        cowebsite: "👆 pour ouvrir le site Web 👀",
        jitsiRoom: "👆 pour entrer dans Jitsi 👀",
        newTab: "👆 pour ouvrir un nouvel onglet 👀",
        object: "👆 pour interagir avec 👀",
    },
};

export default trigger;
