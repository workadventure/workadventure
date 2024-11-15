import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Accetta",
    close: "Chiudi",
    confirm: "Conferma",
    goBackToOnlineStatusLabel: "Vuoi tornare online?",
    allowNotification: "Vuoi consentire le notifiche?",
};

export default statusModal;
