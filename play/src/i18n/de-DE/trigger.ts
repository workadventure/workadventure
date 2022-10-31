import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "Drücke LEERTASTE oder tippe hier um die Webseite zu öffnen",
    newTab: "Drücke LEERTASTE oder tippe hier um die Webseite in einem neuen Tab zu öffnen",
    jitsiRoom: "Drücke LEERTASTE oder tippe hier um dem Jitsi Meet Raum beizutreten",
};

export default trigger;
