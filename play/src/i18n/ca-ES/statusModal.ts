import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Acceptar",
    close: "Tancar",
    confirm: "Confirmar",
    goBackToOnlineStatusLabel: "Vols tornar a estar en línia?",
    allowNotification: "Permetre notificacions?",
    allowNotificationExplanation: "Rep una notificació d'escriptori quan algú vulgui parlar amb tu.",
    soundBlockedBackInAMoment:
        "El teu navegador està bloquejant el so ara mateix, per això ets en mode Torna en un moment.",
    livekitAudioPlaybackBlocked:
        "El navegador ha bloquejat la reproducció d'àudio. Activa el so per sentir la conversa.",
    turnSoundOn: "Activar el so",
};

export default statusModal;
