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
        online: "Online",
        away: "Away",
        disturb: "Do not disturb",
        offline: "Offline",
    },
    subtitle: {
        camera: "Camera",
        microphone: "Microphone",
        speaker: "Audio output",
    },
    help: {
        chat: {
            title: "Send text message",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        users: {
            title: "Display user's list",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        emoji: {
            title: "Display an emoji",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        follow: {
            title: "Ask to follow",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        unfollow: {
            title: "Stop following",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        lock: {
            title: "Lock conversation",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        mic: {
            title: "Enable/disable your microphone",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        cam: {
            title: "Enable/disable your camera",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        share: {
            title: "Share your screen",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
    },
};

export default actionbar;
