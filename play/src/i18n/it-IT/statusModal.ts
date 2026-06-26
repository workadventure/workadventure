import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Accetta",
    allowNotificationExplanation: "Get a desktop notification when someone wants to talk to you.",
    close: "Chiudi",
    confirm: "Conferma",
    goBackToOnlineStatusLabel: "Vuoi tornare online?",
    allowNotification: "Vuoi consentire le notifiche?",
    audioPlaybackBlocked: "Il browser ha bloccato la riproduzione audio.",
    audioPlaybackInterrupted: "La riproduzione audio è stata interrotta dal browser o dal sistema operativo.",
    turnSoundOn: "Attiva l'audio",
};

export default statusModal;
