import type { BaseTranslation } from "../i18n-types";

const notification: BaseTranslation = {
    discussion: "{name} wants to discuss with you",
    message: "{name} sends a message",
    chatRoom: "in the chat room",
    askToMuteMicrophone: "Can I mute your microphone?",
    askToMuteCamera: "Can I mute your camera?",
    microphoneMuted: "Your microphone was muted by a moderator",
    cameraMuted: "Your camera was muted by a moderator",
    announcement: "Announcement",
    open: "Open",
    help: {
        title: "Notifications access denied",
        permissionDenied: "Permission denied",
        content:
            "Do not miss any discussion. Enable notifications to be notified someone wants to talk to you, even you are not on the WorkAdventure tab.",
        firefoxContent:
            'Please click the "Remember this decision" checkbox, if you don\'t want Firefox to keep asking you the authorization.',
        refresh: "Refresh",
        continue: "Continue without notification",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: "add a new tag: '{tag}'",
};

export default notification;
