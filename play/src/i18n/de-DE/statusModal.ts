import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Akzeptieren",
    allowNotificationExplanation: "Eine Desktop-Benachrichtigung erhalten, wenn jemand mit dir sprechen möchte.",
    close: "Schließen",
    confirm: "Bestätigen",
    goBackToOnlineStatusLabel: "Möchtest du wieder online gehen?",
    allowNotification: "Möchtest du Benachrichtigungen erlauben?",
    soundBlockedBackInAMoment:
        'Ihr Browser blockiert den Ton im Moment, deshalb sind Sie im Modus "Komme gleich zurück".',
    livekitAudioPlaybackBlocked:
        "Ihr Browser hat die Audiowiedergabe blockiert. Aktivieren Sie den Ton, um das Gespräch zu hören.",
    turnSoundOn: "Ton aktivieren",
};

export default statusModal;
