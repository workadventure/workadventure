import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "Pulseu [X] o toqueu aquí per obrir el lloc web",
    jitsiRoom: "Pulseu [X] o toqueu aquí per entrar a l'habitació Jitsi Meet",
    newTab: "Pulseu [X] o toqueu aquí per obrir el lloc web a una pestanya nova",
    object: "Pulseu [X] o toqueu aquí per interactuar 👀",
    interactKeyboard: "[X]",
    escapeKeyboard: "[ESC]",
    mobile: {
        cowebsite: "👆 per obrir el lloc web 👀",
        jitsiRoom: "👆 per entrar a Jitsi 👀",
        newTab: "👆 per obrir nova pestanya 👀",
        object: "👆 per interactuar 👀",
    },
};

export default trigger;
