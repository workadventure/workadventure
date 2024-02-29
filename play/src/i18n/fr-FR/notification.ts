import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "veut discuter avec toi",
    message: "a envoyé un message",
    forum: "sur le forum",
    help: {
        title: "Accès aux notifications nécessaire",
        permissionDenied: "Permission refusée",
        content: "Vous devez autoriser les notifications dans votre navigateur.",
        firefoxContent:
            'Veuillez cocher la case "Se souvenir de cette décision" si vous ne voulez pas que Firefox vous demande sans cesse l\'autorisation.',
        refresh: "Rafraîchir",
        continue: "Continuer sans webcam",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
};

export default notification;
