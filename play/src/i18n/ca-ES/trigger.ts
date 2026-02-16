import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "Pulseu ESPAI o toqueu aquí per obrir el lloc web",
    jitsiRoom: "Pulseu ESPAI o toqueu aquí per entrar a l'habitació Jitsi Meet",
    newTab: "Pulseu ESPAI o toqueu aquí per obrir el lloc web a una pestanya nova",
    object: "Pulseu ESPAI o toqueu aquí per interactuar 👀",
    spaceKeyboard: "[ESPAI]",
    mobile: {
        cowebsite: "👆 per obrir el lloc web 👀",
        jitsiRoom: "👆 per entrar a Jitsi 👀",
        newTab: "👆 per obrir nova pestanya 👀",
        object: "👆 per interactuar 👀",
    },
};

export default trigger;
