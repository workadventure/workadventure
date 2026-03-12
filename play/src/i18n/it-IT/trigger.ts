import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: `[SPAZIO] per aprire il sito web 👀`,
    jitsiRoom: "[SPAZIO] per entrare in Jitsi 👀",
    newTab: "[SPAZIO] per aprire una nuova scheda 👀",
    object: "[SPAZIO] per interagire con esso 👀",
    spaceKeyboard: "[SPAZIO]",
    mobile: {
        cowebsite: "👆 per aprire il sito web 👀",
        jitsiRoom: "👆 per entrare in Jitsi 👀",
        newTab: "👆 per aprire una nuova scheda 👀",
        object: "👆 per interagire con esso 👀",
    },
};

export default trigger;
