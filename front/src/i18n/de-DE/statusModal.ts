import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Akzeptieren",
    close: "Schließen",
    confirm: "Bestätigen",
    goBackToOnlineStatusLabel: "Möchtest du wieder online gehen?",
    allowNotification: "Möchtest du Benachrichtigungen erlauben?",
};

export default statusModal;
