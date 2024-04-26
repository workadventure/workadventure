import type { BaseTranslation } from "../i18n-types";

const notification: BaseTranslation = {
    discussion: "wants to discuss with you",
    message: "sends a message",
    forum: "on the forum",
    askToMuteMicrophone: "Ask to mute your Microphone 🙏",
    askToMuteCamera: "Ask to mute your Camera 🙏",
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
