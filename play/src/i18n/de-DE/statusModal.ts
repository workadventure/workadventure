import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Akzeptieren",
    allowNotificationExplanation: "Eine Desktop-Benachrichtigung erhalten, wenn jemand mit dir sprechen möchte.",
    close: "Schließen",
    confirm: "Bestätigen",
    goBackToOnlineStatusLabel: "Möchtest du wieder online gehen?",
    allowNotification: "Möchtest du Benachrichtigungen erlauben?",
};

export default statusModal;
