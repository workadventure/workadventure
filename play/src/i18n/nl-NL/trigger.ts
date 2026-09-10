import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: `[X] om de website te openen 👀`,
    jitsiRoom: "[X] om Jitsi binnen te gaan 👀",
    newTab: "[X] om een nieuw tabblad te openen 👀",
    object: "[X] om ermee te interageren 👀",
    interactKeyboard: "[X]",
    escapeKeyboard: "[ESC]",
    mobile: {
        cowebsite: "👆 om de website te openen 👀",
        jitsiRoom: "👆 om Jitsi binnen te gaan 👀",
        newTab: "👆 om een nieuw tabblad te openen 👀",
        object: "👆 om ermee te interageren 👀",
    },
};

export default trigger;
