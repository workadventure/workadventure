import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "Tłoc PROZNU TASTU abo pótusni how, aby se wótcynił webbok",
    newTab: "Tłoc PROZNU TASTU abo pótusni how, aby webbok se wótcynił we nowem tabje",
    jitsiRoom: "Tłoc PROZNU TASTU abo pótusni how, aby stupił do Jitsi-Meet-śpy",
    object: "Tłoc PROZNU TASTU abo pótusni how, aby z nim interagował 👀",
    spaceKeyboard: "[PROZNA TASTA]",
    mobile: {
        cowebsite: "👆 aby se wótcynił webbok 👀",
        jitsiRoom: "👆 aby stupił do Jitsi 👀",
        newTab: "👆 aby se wótcynił nowy tab 👀",
        object: "👆 aby z nim interagował 👀",
    },
};

export default trigger;
