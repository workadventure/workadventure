import type { BaseTranslation } from "../i18n-types";

const notification: BaseTranslation = {
    discussion: "wants to discuss with you",
    message: "sends a message",
    forum: "on the forum",
    askToMuteMicrophone: "Ask to mute your Microphone 🙏",
    askToMuteCamera: "Ask to mute your Camera 🙏",
    help: {
        title: "Notification access needed",
        permissionDenied: "Permission denied",
        content: "You must allow notification access in your browser.",
        firefoxContent:
            'Please click the "Remember this decision" checkbox, if you don\'t want Firefox to keep asking you the authorization.',
        refresh: "Refresh",
        continue: "Continue without notification",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
};

export default notification;
