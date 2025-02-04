import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Accepter",
    close: "Fermer",
    confirm: "Confirmer",
    goBackToOnlineStatusLabel: "Veux-tu revenir en ligne ?",
    allowNotification: "Autoriser les notifications ?",
    allowNotificationExplanation: "Recevoir une notification de bureau lorsque quelqu'un souhaite me parler.",
};

export default statusModal;
