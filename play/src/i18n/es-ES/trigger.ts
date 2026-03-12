import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "Pulse ESPACIO o toque aquí para abrir el sitio web",
    jitsiRoom: "Pulse ESPACIO o toque aquí para entrar en la habitación Jitsi Meet",
    newTab: "Pulse ESPACIO o toque aquí para abrir el sitio web en una pestaña nueva",
    object: "Pulse ESPACIO o toque aquí para interactuar 👀",
    spaceKeyboard: "[ESPACIO]",
    mobile: {
        cowebsite: "👆 para abrir el sitio web 👀",
        jitsiRoom: "👆 para entrar en Jitsi 👀",
        newTab: "👆 para abrir nueva pestaña 👀",
        object: "👆 para interactuar 👀",
    },
};

export default trigger;
