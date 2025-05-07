import type { BaseTranslation } from "../i18n-types";

const camera: BaseTranslation = {
    editCam: "Edit camera",
    editMic: "Edit microphone",
    editSpeaker: "Edit audio output",
    active: "Active",
    disabled: "Disabled",
    notRecommended: "Not recommended",
    enable: {
        title: "Turn on your camera and microphone",
        start: "Welcome to our audio and video device configuration page! Find the tools here to enhance your online experience. Adjust settings to your preferences to address any potential issues. Ensure your hardware is properly connected and up to date. Explore and test different configurations to find what works best for you.",
    },
    help: {
        title: "Camera / Microphone access needed",
        permissionDenied: "Permission denied",
        content: "You must allow camera and microphone access in your browser.",
        firefoxContent:
            'Please click the "Remember this decision" checkbox, if you don\'t want Firefox to keep asking you the authorization.',
        allow: "Allow webcam",
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
        solutionVpnNotAskAgain: "Understood. Don't warn me again 🫡",
        solutionHotspot:
            "If you are on a restricted network (company network...), try switching network. For instance, create a <strong>Wifi hotspot</strong> with your phone and connect via your phone.",
        solutionNetworkAdmin: "If you are a <strong>network administrator</strong>, review the ",
        preparingYouNetworkGuide: '"Preparing your network" guide',
        refresh: "Refresh",
        continue: "Continue",
        newDeviceDetected: "New device detected {device} 🎉 Switch? [SPACE]",
    },
    my: {
        silentZone: "Silent zone",
        silentZoneDesc:
            "You are in a silent zone. You can only see and hear the people you are with. You can not see or hear the other people in the room.",
        nameTag: "You",
        loading: "Loading your camera...",
    },
    disable: "Turn off your camera",
    menu: {
        moreAction: "More actions",
        closeMenu: "Close menu",
        senPrivateMessage: "Send a private message (coming soon)",
        kickoffUser: "Kick off user",
        muteAudioUser: "Mute audio",
        muteAudioEveryBody: "Mute audio for everybody",
        muteVideoUser: "Mute video",
        muteVideoEveryBody: "Mute video for everybody",
        pin: "Pin",
        blockOrReportUser: "Moderation",
    },
};

export default camera;
