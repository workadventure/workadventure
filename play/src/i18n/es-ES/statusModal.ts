import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Aceptar",
    close: "Cerrar",
    confirm: "Confirmar",
    goBackToOnlineStatusLabel: "¿Quieres volver a estar en línea?",
    allowNotification: "¿Permitir notificaciones?",
    allowNotificationExplanation: "Recibe una notificación de escritorio cuando alguien quiera hablar contigo.",
};

export default statusModal;
