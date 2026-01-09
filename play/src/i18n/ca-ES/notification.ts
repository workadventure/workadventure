import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} vol discutir amb tu",
    message: "{name} t'envia un missatge",
    chatRoom: "a la sala de xat",
    askToMuteMicrophone: "Puc silenciar el teu micròfon?",
    askToMuteCamera: "Puc silenciar la teva càmera?",
    microphoneMuted: "El teu micròfon ha estat silenciat per un moderador",
    cameraMuted: "La teva càmera ha estat silenciada per un moderador",
    notificationSentToMuteMicrophone: "S'ha enviat una notificació a {name} per silenciar el seu micròfon",
    notificationSentToMuteCamera: "S'ha enviat una notificació a {name} per silenciar la seva càmera",
    announcement: "Anunci",
    open: "Obrir",
    help: {
        title: "Accés a les notificacions denegat",
        permissionDenied: "Permís denegat",
        content:
            "No et perdis cap discussió. Activa les notificacions per ser notificat quan algú vulgui parlar amb tu, fins i tot si no estàs a la pestanya de WorkAdventure.",
        firefoxContent:
            'Si us plau, marca la casella "Recordar aquesta decisió" si no vols que Firefox continuï demanant-te l\'autorització.',
        refresh: "Actualitzar",
        continue: "Continuar sense notificacions",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: 'afegir un nou tag: "{tag}"',
    screenSharingError: "No es pot iniciar el compartir de pantalla",
    urlCopiedToClipboard: "URL copiada al porta-retalls",
};

export default notification;
