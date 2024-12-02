import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    edit: "Edit",
    cancel: "Cancel",
    close: "Close",
    login: "Login",
    admin: "Admin",
    profil: "Edit profil",
    woka: "Customize your avatar",
    companion: "Add companion",
    quest: "Achievements",
    megaphone: "Use megaphone",
    test: "Test my settings",
    editCamMic: "Edit cam / mic",
    accountType: "Basic account",
    upgrade: "Upgrade",
    otherSettings: "Other settings",
    calendar: "Open / Close calendar",
    bo: "Back office",
    globalMessage: "Send global message",
    mapEditor: "Map editor",
    app: "Ouvrir / Fermer les applications",
    camera: {
        disabled: "Your camera is disabled",
        activate: "Activate your camera",
    },
    microphone: {
        disabled: "Your microphone is disabled",
        activate: "Activate your microphone",
    },
    status: {
        ONLINE: "Online",
        AWAY: "Away",
        DO_NOT_DISTURB: "Do not disturb",
        OFFLINE: "Offline",
    },
    subtitle: {
        camera: "Camera",
        microphone: "Microphone",
        speaker: "Audio output",
    },
    help: {
        chat: {
            title: "Send text message",
        },
        users: {
            title: "Display user's list",
        },
        emoji: {
            title: "Display an emoji",
        },
        follow: {
            title: "Ask to follow",
        },
        unfollow: {
            title: "Stop following",
        },
        lock: {
            title: "Lock conversation",
        },
        mic: {
            title: "Enable/disable your microphone",
        },
        cam: {
            title: "Enable/disable your camera",
        },
        share: {
            title: "Share your screen",
        },
    },
};

export default actionbar;
