import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const companion: DeepPartial<Translation["cowebsite"]> = {
    open: "Ouvrir",
    close: "Fermer",
    bigBlueButton: "BigBlueButton",
    jitsi: "Jitsi",
};

export default companion;
