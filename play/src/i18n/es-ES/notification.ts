import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} quiere discutir contigo",
    message: "{name} te envía un mensaje",
    chatRoom: "en la sala de chat",
    askToMuteMicrophone: "¿Puedo silenciar tu micrófono?",
    askToMuteCamera: "¿Puedo silenciar tu cámara?",
    microphoneMuted: "Tu micrófono ha sido silenciado por un moderador",
    cameraMuted: "Tu cámara ha sido silenciada por un moderador",
    notificationSentToMuteMicrophone: "Se ha enviado una notificación a {name} para silenciar su micrófono",
    notificationSentToMuteCamera: "Se ha enviado una notificación a {name} para silenciar su cámara",
    announcement: "Anuncio",
    open: "Abrir",
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
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: 'añadir un nuevo tag: "{tag}"',
    screenSharingError: "No se puede iniciar el compartir de pantalla",
    urlCopiedToClipboard: "URL copiada al portapapeles",
};

export default notification;
