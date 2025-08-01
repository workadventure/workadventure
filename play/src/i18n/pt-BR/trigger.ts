import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "[ESPAÇO] para abrir site 👀",
    jitsiRoom: "[ESPAÇO] para entrar no Jitsi 👀",
    newTab: "[ESPAÇO] para abrir nova aba 👀",
    object: "[ESPAÇO] para interagir com ele 👀",
    spaceKeyboard: "[ESPAÇO]",
    mobile: {
        cowebsite: "👆 para abrir site 👀",
        jitsiRoom: "👆 para entrar no Jitsi 👀",
        newTab: "👆 para abrir nova aba 👀",
        object: "👆 para interagir com ele 👀",
    },
};

export default trigger;
