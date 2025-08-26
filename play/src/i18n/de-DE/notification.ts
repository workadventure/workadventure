import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} möchte mit dir sprechen",
    message: "{name} sendet eine Nachricht",
    chatRoom: "im Forum",
    askToMuteMicrophone: "Bitte dein Mikrofon stummschalten 🙏",
    askToMuteCamera: "Bitte deine Kamera stummschalten 🙏",
    microphoneMuted: "Ihr Mikrofon wurde von einem Moderator stummgeschaltet",
    cameraMuted: "Ihre Kamera wurde von einem Moderator stummgeschaltet",
    announcement: "Ankündigung",
    open: "Öffnen",
    help: {
        title: "Zugriff auf Benachrichtigungen verweigert",
        permissionDenied: "Zugriff verweigert",
        content:
            "Verpasse keine Diskussion. Aktiviere Benachrichtigungen, um informiert zu werden, wenn jemand mit dir sprechen möchte, auch wenn du nicht im WorkAdventure-Tab bist.",
        firefoxContent:
            'Bitte klicke auf das Kästchen "Diese Entscheidung merken", wenn du nicht möchtest, dass Firefox weiterhin nach der Erlaubnis fragt.',
        refresh: "Aktualisieren",
        continue: "Ohne Benachrichtigung fortfahren",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: "neuen Tag hinzufügen: '{tag}'",
    screenSharingError: "Bildschirmfreigabe kann nicht gestartet werden",
};

export default notification;
