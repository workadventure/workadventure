import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} veut discuter avec toi",
    message: "{name} a envoyé un message",
    chatRoom: "sur le salon",
    askToMuteMicrophone: "Puis-je couper votre micro?",
    askToMuteCamera: "Puis-je couper votre caméra?",
    microphoneMuted: "Votre micro a été coupé par un modérateur",
    cameraMuted: "Votre caméra a été coupée par un modérateur",
    announcement: "Annonce",
    open: "Ouvrir",
    help: {
        title: "Accès aux notifications refusé",
        permissionDenied: "Permission refusée",
        content:
            "Ne manquez aucune discussion. Activez les notifications pour être informé(e) lorsque quelqu'un souhaite vous parler, même si vous n'êtes pas sur l'onglet WorkAdventure.",
        firefoxContent:
            'Veuillez cocher la case "Se souvenir de cette décision" si vous ne voulez pas que Firefox vous demande sans cesse l\'autorisation.',
        refresh: "Rafraîchir",
        continue: "Continuer sans les notifications",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: 'nouveau tag : "{tag}"',
};

export default notification;
