import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} vuole discutere con te",
    message: "{name} invia un messaggio",
    chatRoom: "nella chat room",
    askToMuteMicrophone: "Chiedi di disattivare il microfono 🙏",
    askToMuteCamera: "Chiedi di disattivare la fotocamera 🙏",
    microphoneMuted: "Il tuo microfono è stato disattivato da un moderatore",
    cameraMuted: "La tua fotocamera è stata disattivata da un moderatore",
    notificationSentToMuteMicrophone: "È stata inviata una notifica a {name} per disattivare il microfono",
    notificationSentToMuteCamera: "È stata inviata una notifica a {name} per disattivare la fotocamera",
    announcement: "Annuncio",
    open: "Apri",
    help: {
        title: "Accesso alle notifiche negato",
        permissionDenied: "Permesso negato",
        content:
            "Non perdere nessuna discussione. Abilita le notifiche per essere avvisato quando qualcuno vuole parlare con te, anche se non sei sulla scheda WorkAdventure.",
        firefoxContent:
            'Si prega di cliccare sulla casella "Ricorda questa decisione", se non vuoi che Firefox continui a chiederti l\'autorizzazione.',
        refresh: "Ricarica",
        continue: "Continua senza notifica",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: "aggiungi un nuovo tag: '{tag}'",
    screenSharingError: "Impossibile avviare la condivisione dello schermo",
    recordingStarted: "Una persona nella discussione ha avviato una registrazione.",
    urlCopiedToClipboard: "URL copiato negli appunti",
};

export default notification;
