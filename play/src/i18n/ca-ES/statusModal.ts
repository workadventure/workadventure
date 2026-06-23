import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Acceptar",
    close: "Tancar",
    confirm: "Confirmar",
    goBackToOnlineStatusLabel: "Vols tornar a estar en línia?",
    allowNotification: "Permetre notificacions?",
    allowNotificationExplanation: "Rep una notificació d'escriptori quan algú vulgui parlar amb tu.",
    audioPlaybackBlocked: "El navegador ha bloquejat la reproducció d'àudio.",
    audioPlaybackInterrupted: "El navegador o el sistema operatiu ha interromput la reproducció d'àudio.",
    turnSoundOn: "Activar el so",
};

export default statusModal;
