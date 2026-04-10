import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Aceptar",
    close: "Cerrar",
    confirm: "Confirmar",
    goBackToOnlineStatusLabel: "¿Quieres volver a estar en línea?",
    allowNotification: "¿Permitir notificaciones?",
    allowNotificationExplanation: "Recibe una notificación de escritorio cuando alguien quiera hablar contigo.",
    soundBlockedBackInAMoment:
        "Tu navegador está bloqueando el sonido por ahora, por eso estás en modo Vuelve en un momento.",
    turnSoundOn: "Activar sonido",
};

export default statusModal;
