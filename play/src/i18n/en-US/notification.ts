import type { BaseTranslation } from "../i18n-types";

const notification: BaseTranslation = {
    discussion: "{name} wants to discuss with you",
    message: "{name} sends a message",
    mention: "{name} mentioned you",
    askToMuteMicrophone: "Can I mute your microphone?",
    askToMuteCamera: "Can I mute your camera?",
    microphoneMuted: "Your microphone was muted by a moderator",
    cameraMuted: "Your camera was muted by a moderator",
    givenTheFloor: "It's your turn to speak",
    givenTheFloorEnableMicrophone: "It's your turn to speak — enable your microphone",
    floorRevoked: "You no longer have the floor",
    floorGivenBack: "You gave back the floor",
    handLowered: "A moderator lowered your hand",
    removedFromConversation: "A moderator removed you from the conversation.",
    actionFailed: "This action could not be completed",
    announcement: "Announcement",
    a11y: {
        chatMessage: "{sender:string}: {excerpt:string}",
        directMessage: "Private message from {sender:string}: {excerpt:string}",
        mention: "{sender:string} mentioned you in {room:string}: {excerpt:string}",
        roomMessage: "{sender:string} in {room:string}: {excerpt:string}",
        bubbleLocked: "The conversation is locked: nobody else can join",
        bubbleUnlocked: "The conversation is unlocked",
        handRaised: "{name:string} raised their hand",
        megaphone: "{name:string} is speaking through the megaphone",
    },
    help: {
        title: "Notifications access denied",
        permissionDenied: "Permission denied",
        content:
            "Do not miss any discussion. Enable notifications to know when someone wants to talk to you, even when you are not on the WorkAdventure tab.",
        firefoxContent:
            'Please check the "Remember this decision" box if you don\'t want Firefox to keep asking you for permission.',
        refresh: "Refresh",
        continue: "Continue without notification",
        screen: {
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
        screenAlt: "Allowing notifications from the address bar in Chrome",
    },
    addNewTag: "add a new tag: '{tag}'",
    screenSharingError: "Cannot start screen sharing",
    recordingStarted: "One person in the discussion has started a recording.",
    urlCopiedToClipboard: "Url copied to clipboard",
};

export default notification;
