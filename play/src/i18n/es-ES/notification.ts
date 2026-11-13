import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} quiere discutir contigo",
    message: "{name} te envía un mensaje",
    mention: "{name} te ha mencionado",
    askToMuteMicrophone: "¿Puedo silenciar tu micrófono?",
    askToMuteCamera: "¿Puedo silenciar tu cámara?",
    microphoneMuted: "Tu micrófono ha sido silenciado por un moderador",
    cameraMuted: "Tu cámara ha sido silenciada por un moderador",
    givenTheFloor: "Es tu turno de hablar",
    givenTheFloorEnableMicrophone: "Es tu turno de hablar — activa tu micrófono",
    floorRevoked: "Ya no tienes la palabra",
    floorGivenBack: "Has devuelto la palabra",
    handLowered: "Un moderador ha bajado tu mano",
    removedFromConversation: "Un moderador te ha retirado de la conversación.",
    actionFailed: "No se ha podido completar esta acción",
    announcement: "Anuncio",
    a11y: {
        chatMessage: "{sender}: {excerpt}",
        directMessage: "Mensaje privado de {sender}: {excerpt}",
        mention: "{sender} te ha mencionado en {room}: {excerpt}",
        roomMessage: "{sender} en {room}: {excerpt}",
        bubbleLocked: "La conversación está bloqueada: nadie más puede unirse",
        bubbleUnlocked: "La conversación está desbloqueada",
        handRaised: "{name} ha levantado la mano",
        megaphone: "{name} habla por el megáfono",
    },
    help: {
        title: "Acceso a las notificaciones denegado",
        permissionDenied: "Permiso denegado",
        content:
            "No te pierdas ninguna discusión. Activa las notificaciones para ser notificado cuando alguien quiera hablar contigo, incluso si no estás en la pestaña de WorkAdventure.",
        firefoxContent:
            'Por favor, marca la casilla "Recordar esta decisión" si no quieres que Firefox siga pidiéndote la autorización.',
        refresh: "Actualizar",
        continue: "Continuar sin notificaciones",
        screen: {
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
        screenAlt: "Permitir las notificaciones desde la barra de direcciones en Chrome",
    },
    addNewTag: 'añadir un nuevo tag: "{tag}"',
    screenSharingError: "No se puede iniciar el compartir de pantalla",
    recordingStarted: "Una persona en la discusión ha comenzado una grabación.",
    urlCopiedToClipboard: "URL copiada al portapapeles",
};

export default notification;
