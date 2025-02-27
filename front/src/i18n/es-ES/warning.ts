import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "¡Atención!",
    content: `¡Este mundo está acercándose a su límite! Puede actualizar su capacidad <a href="{upgradeLink}" target="_blank">aquí</a>`,
    limit: "¡Este mundo está acercándose a su límite!",
    accessDenied: {
        camera: "Acceso a la cámara denegado. Haga clic aquí y revise los permisos de su navegador.",
        screenSharing: "Compartir pantalla denegado. Haga clic aquí y revise los permisos de su navegador.",
        room: "Acceso a la habitación denegado. No tiene permitido entrar en esta habitación.",
        teleport: "No tiene derecho a teletransportarse a este usuario.",
    },
    importantMessage: "Mensaje importante",
    connectionLost: "Conexión perdida. Reconectando...",
    connectionLostTitle: "Conexión perdida",
    connectionLostSubtitle: "Reconectando",
    waitingConnectionTitle: "Esperando a la conexión",
    waitingConnectionSubtitle: "Conectando",
    popupBlocked: {
        title: "Bloqueo de ventanas emergentes",
        content: "Por favor, permita ventanas emergentes para este sitio web en la configuración de su navegador.",
        done: "Ok",
    },
};

export default warning;
