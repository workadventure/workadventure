import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const messageScreen: DeepPartial<Translation["messageScreen"]> = {
    connecting: "Verbinden...",
    pleaseWait: "Bitte warten Sie, während wir Sie mit dem Raum verbinden.",
};

export default messageScreen;
