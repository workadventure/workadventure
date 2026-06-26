import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Akzeptieren",
    allowNotificationExplanation: "Eine Desktop-Benachrichtigung erhalten, wenn jemand mit dir sprechen möchte.",
    close: "Schließen",
    confirm: "Bestätigen",
    goBackToOnlineStatusLabel: "Möchtest du wieder online gehen?",
    allowNotification: "Möchtest du Benachrichtigungen erlauben?",
    audioPlaybackBlocked: "Ihr Browser hat die Audiowiedergabe blockiert.",
    audioPlaybackInterrupted: "Die Audiowiedergabe wurde von Ihrem Browser oder Betriebssystem unterbrochen.",
    turnSoundOn: "Ton aktivieren",
};

export default statusModal;
