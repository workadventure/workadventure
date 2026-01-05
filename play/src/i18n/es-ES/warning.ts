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
    browserNotSupported: {
        title: "😢 Navegador no compatible",
        message: "Su navegador ({browserName}) ya no es compatible con WorkAdventure.",
        description:
            "Su navegador es demasiado antiguo para ejecutar WorkAdventure. Por favor, actualícelo a la última versión para continuar.",
        whatToDo: "¿Qué puede hacer?",
        option1: "Actualizar {browserName} a la última versión",
        option2: "Salir de WorkAdventure y usar un navegador diferente",
        updateBrowser: "Actualizar navegador",
        leave: "Salir",
    },
};

export default warning;
