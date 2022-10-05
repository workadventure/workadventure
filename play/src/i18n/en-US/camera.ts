import type { BaseTranslation } from "../i18n-types";

const camera: BaseTranslation = {
    enable: {
        title: "Turn on your camera and microphone",
        start: "Let's go!",
    },
    help: {
        title: "Camera / Microphone access needed",
        permissionDenied: "Permission denied",
        content: "You must allow camera and microphone access in your browser.",
        firefoxContent:
            'Please click the "Remember this decision" checkbox, if you don\'t want Firefox to keep asking you the authorization.',
        refresh: "Refresh",
        continue: "Continue without webcam",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
    },
    my: {
        silentZone: "Silent zone",
    },
    disable: "Turn off your camera",
};

export default camera;
