import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "Pulse [X] o toque aquí para abrir el sitio web",
    jitsiRoom: "Pulse [X] o toque aquí para entrar en la habitación Jitsi Meet",
    newTab: "Pulse [X] o toque aquí para abrir el sitio web en una pestaña nueva",
    object: "Pulse [X] o toque aquí para interactuar 👀",
    interactKeyboard: "[X]",
    escapeKeyboard: "[ESC]",
    mobile: {
        cowebsite: "👆 para abrir el sitio web 👀",
        jitsiRoom: "👆 para entrar en Jitsi 👀",
        newTab: "👆 para abrir nueva pestaña 👀",
        object: "👆 para interactuar 👀",
    },
};

export default trigger;
