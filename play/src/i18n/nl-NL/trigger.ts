import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: `[SPATIE] om de website te openen 👀`,
    jitsiRoom: "[SPATIE] om Jitsi binnen te gaan 👀",
    newTab: "[SPATIE] om een nieuw tabblad te openen 👀",
    object: "[SPATIE] om ermee te interageren 👀",
    spaceKeyboard: "[SPATIE]",
    mobile: {
        cowebsite: "👆 om de website te openen 👀",
        jitsiRoom: "👆 om Jitsi binnen te gaan 👀",
        newTab: "👆 om een nieuw tabblad te openen 👀",
        object: "👆 om ermee te interageren 👀",
    },
};

export default trigger;
