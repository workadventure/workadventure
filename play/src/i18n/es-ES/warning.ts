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
    megaphoneNeeds: "Para usar el megáfono, debes activar tu cámara o tu micrófono o compartir tu pantalla.",
    mapEditorShortCut: "Hubo un error al intentar abrir el editor de mapas.",
    mapEditorNotEnabled: "El editor de mapas no está habilitado en este mundo.",
    backgroundProcessing: {
        failedToApply: "Error al aplicar los efectos de fondo",
    },
    popupBlocked: {
        title: "Bloqueo de ventanas emergentes",
        content: "Por favor, permita ventanas emergentes para este sitio web en la configuración de su navegador.",
        done: "Ok",
    },
    duplicateUserConnected: {
        title: "Ya conectado",
        message:
            "Este usuario ya está conectado a esta sala desde otra pestaña o dispositivo. Para evitar conflictos, cierre la otra pestaña o ventana.",
        confirmContinue: "Entendido, continuar",
        dontRemindAgain: "No volver a mostrar este mensaje",
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
    pwaInstall: {
        title: "Instalar WorkAdventure",
        description:
            "Instale la aplicación para una mejor experiencia: carga más rápida, acceso rápido y experiencia tipo aplicación.",
        descriptionIos: "Añada WorkAdventure a la pantalla de inicio para una mejor experiencia y acceso rápido.",
        feature1Title: "Rendimiento máximo",
        feature1Description: "Carga ultrarrápida y fluida.",
        feature2Title: "Notificaciones de escritorio",
        feature2Description: "No pierda ninguna interacción.",
        feature3Title: "Experiencia inmersiva",
        feature3Description: "Pantalla completa, sin distracciones.",
        iosStepsTitle: "Cómo instalar",
        iosStep1: "Toque el botón Compartir (cuadrado con flecha) en la parte inferior de Safari.",
        iosStep2: "Desplácese hacia abajo y toque «Añadir a la pantalla de inicio».",
        iosStep3: "Toque «Añadir» para confirmar.",
        install: "Instalar la app WorkAdventure",
        installing: "Instalando…",
        skip: "Continuar en el navegador",
        continue: "Continuar en el navegador",
        neverShowPage: "No volver a preguntar",
    },
};

export default warning;
