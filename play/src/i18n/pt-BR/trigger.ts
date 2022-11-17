import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "Pressione ESPAÇO ou toque aqui para abrir o site",
    jitsiRoom: "Pressione ESPAÇO ou toque aqui para entrar na sala do Jitsi Meet",
    newTab: "Pressione ESPAÇO ou toque aqui para abrir o site em uma nova guia",
};

export default trigger;
