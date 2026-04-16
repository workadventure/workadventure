import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Accepter",
    close: "Fermer",
    confirm: "Confirmer",
    goBackToOnlineStatusLabel: "Veux-tu revenir en ligne ?",
    allowNotification: "Autoriser les notifications ?",
    allowNotificationExplanation: "Recevoir une notification de bureau lorsque quelqu'un souhaite me parler.",
    soundBlockedBackInAMoment:
        'Votre navigateur bloque le son pour le moment, vous êtes donc en mode "Revient dans un moment".',
    turnSoundOn: "Activer le son",
};

export default statusModal;
