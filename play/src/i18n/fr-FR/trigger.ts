import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "[ESPACE] ou ici pour ouvrir le site Web 👀",
    jitsiRoom: "[ESPACE] ou ici pour entrer dans la salle conférence Jitsi 👀",
    newTab: "[ESPACE] ou ici pour ouvrir le site Web dans un nouvel onglet 👀",
    object: "[ESPACE] pour interagir avec 👀",
    spaceKeyboard: "[ESPACE]",
    mobile: {
        cowebsite: "Clique ici pour ouvrir le site Web 👀",
        jitsiRoom: "Clique ici pour entrer dans la salle conférence Jitsi 👀",
        newTab: "Clique ici pour ouvrir le site Web dans un nouvel onglet 👀",
        object: "Clique ici pour interagir avec 👀",
    },
};

export default trigger;
