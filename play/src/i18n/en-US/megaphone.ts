import type { BaseTranslation } from "../i18n-types";

const megaphone: BaseTranslation = {
    announcement: {
        title: "Send an announcement",
        audience: "Who receives it?",
        thisRoom: "This room",
        wholeWorld: "Whole world",
        place: "Place to join (optional)",
        noPlace: "No place",
        noPlaceOnMap: "This map has no named area yet.",
        preview: "Preview",
        sendToRoom: "Send to this room",
        sendToWorld: "Send to the whole world",
        confirmWorld: "Every room of the world will receive it.",
        confirmSend: "Yes, send to the whole world",
        cancel: "Cancel",
        sentToRoom: "Announcement sent to this room",
        sentToWorld: "Announcement sent to the whole world",
        join: "Join {place}",
        joinMap: "Join",
        placeNotFound: "This place no longer exists on the map.",
        admin: "Administrator",
        more: "Announcements waiting: {count}",
    },
    modal: {
        liveMessage: {
            microphoneOff: "Microphone off",
            cameraOff: "Camera off",
            cameraOffHint: "You can go live with your microphone only.",
            devices: "Camera and microphone",
            whoHears: "Who hears you?",
            thisRoom: "This room",
            wholeWorld: "Every room of the world",
            live: "Live",
            stop: "Stop",
            title: "Megaphone",
        },
    },
};

export default megaphone;
