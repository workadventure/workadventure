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
    webrtc: {
        title: "Video relay server connection error",
        titlePending: "Video relay server connection pending",
        error: "TURN server isn't reachable",
        content: "The video relay server cannot be reached. You may be unable to communicate with other users.",
        solutionVpn:
            "If you are <strong>connecting via a VPN</strong>, please disconnect from you VPN and refresh the web page.",
        solutionHotspot:
            "If you are on a restricted network (company network...), try switching network. For instance, create a <strong>Wifi hotspot</strong> with your phone and connect via your phone.",
        solutionNetworkAdmin: "If you are a <strong>network administrator</strong>, review the ",
        preparingYouNetworkGuide: '"Preparing your network" guide',
        refresh: "Refresh",
        continue: "Continue",
    },
    my: {
        silentZone: "Silent zone",
        nameTag: "You",
    },
    disable: "Turn off your camera",
};

export default camera;
