import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Accetta",
    allowNotificationExplanation: "Get a desktop notification when someone wants to talk to you.",
    close: "Chiudi",
    confirm: "Conferma",
    goBackToOnlineStatusLabel: "Vuoi tornare online?",
    allowNotification: "Vuoi consentire le notifiche?",
    soundBlockedBackInAMoment:
        "Il tuo browser sta bloccando l'audio per il momento, quindi sei in modalita Torno subito.",
    livekitAudioPlaybackBlocked:
        "Il browser ha bloccato la riproduzione audio. Attiva l'audio per ascoltare la conversazione.",
    turnSoundOn: "Attiva l'audio",
};

export default statusModal;
