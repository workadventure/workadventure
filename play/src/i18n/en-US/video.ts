import type { BaseTranslation } from "../i18n-types";

const video: BaseTranslation = {
    connection_issue: "Network connectivity issue",
    no_video_stream_received: "No video stream received.",
    user_is_muted: "{name} is muted.",
    reduce: "Reduce",
    connecting: "Connecting...",
    reconnecting: "Reconnecting...",
    persistent_connection_issue: "Reconnecting... Unstable connection...",
    click_and_drag_to_resize: "Click and drag to resize",
    click_to_unblock: "Click to unblock",
    away: {
        subtitle: "Paused while you're away",
        cantSeeOrHear: "No one can see or hear you",
        heardNotSeen: "You can be heard, but not seen",
        cantSee: "No one can see you",
        seenNotHeard: "You can be seen, but not heard",
        cantHear: "No one can hear you",
        turnOnBoth: "Turn on camera and mic",
        turnOnCamera: "Turn on camera",
        turnOnMicrophone: "Turn on mic",
        turnOn: "Turn on",
    },
    remoteAway: {
        inAnotherWindow: "{name} is in another window or tab",
        cameraAndMicPaused: "Camera and mic paused until they're back",
        cameraPaused: "Camera paused until they're back",
        micPaused: "Mic paused until they're back",
    },
};

export default video;
