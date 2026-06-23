import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Aceptar",
    close: "Cerrar",
    confirm: "Confirmar",
    goBackToOnlineStatusLabel: "¿Quieres volver a estar en línea?",
    allowNotification: "¿Permitir notificaciones?",
    allowNotificationExplanation: "Recibe una notificación de escritorio cuando alguien quiera hablar contigo.",
    audioPlaybackBlocked: "Tu navegador ha bloqueado la reproducción de audio.",
    audioPlaybackInterrupted: "La reproducción de audio fue interrumpida por tu navegador o sistema operativo.",
    turnSoundOn: "Activar sonido",
};

export default statusModal;
