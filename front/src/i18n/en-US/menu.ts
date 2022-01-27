import type { BaseTranslation } from "../i18n-types";

const menu: BaseTranslation = {
    title: "Menu",
    icon: {
        open: {
            menu: "Open menu",
            invite: "Show invite",
            register: "Register",
            chat: "Open chat",
        },
    },
    visitCard: {
        close: "Close",
    },
    profile: {
        edit: {
            name: "Edit your name",
            woka: "Edit your WOKA",
            companion: "Edit your companion",
            camera: "Edit your camera",
        },
        login: "Sign in",
        logout: "Log out",
    },
    settings: {
        gameQuality: {
            title: "Game quality",
            short: {
                high: "High (120 fps)",
                medium: "Medium (60 fps)",
                small: "Small (40 fps)",
                minimum: "Minimum (20 fps)",
            },
            long: {
                high: "High video quality (120 fps)",
                medium: "Medium video quality (60 fps, recommended)",
                small: "Small video quality (40 fps)",
                minimum: "Minimum video quality (20 fps)",
            },
        },
        videoQuality: {
            title: "Video quality",
            short: {
                high: "High (30 fps)",
                medium: "Medium (20 fps)",
                small: "Small (10 fps)",
                minimum: "Minimum (5 fps)",
            },
            long: {
                high: "High video quality (30 fps)",
                medium: "Medium video quality (20 fps, recommended)",
                small: "Small video quality (10 fps)",
                minimum: "Minimum video quality (5 fps)",
            },
        },
        language: {
            title: "Language",
        },
        save: {
            warning: "(Saving these settings will restart the game)",
            button: "Save",
        },
        fullscreen: "Fullscreen",
        notifications: "Notifications",
        cowebsiteTrigger: "Always ask before opening websites and Jitsi Meet rooms",
        ignoreFollowRequest: "Ignore requests to follow other users",
    },
    invite: {
        description: "Share the link of the room!",
        copy: "Copy",
        share: "Share",
    },
    globalMessage: {
        text: "Text",
        audio: "Audio",
        warning: "Broadcast to all rooms of the world",
        enter: "Enter your message here...",
        send: "Send",
    },
    globalAudio: {
        uploadInfo: "Upload a file",
        error: "No file selected. You need to upload a file before sending it.",
    },
    contact: {
        gettingStarted: {
            title: "Getting started",
            description:
                "WorkAdventure allows you to create an online space to communicate spontaneously with others. And it all starts with creating your own space. Choose from a large selection of prefabricated maps by our team.",
        },
        createMap: {
            title: "Create your map",
            description: "You can also create your own custom map by following the step of the documentation.",
        },
    },
    about: {
        mapInfo: "Information on the map",
        mapLink: "link to this map",
        copyrights: {
            map: {
                title: "Copyrights of the map",
                empty: "The map creator did not declare a copyright for the map.",
            },
            tileset: {
                title: "Copyrights of the tilesets",
                empty: "The map creator did not declare a copyright for the tilesets. This doesn't mean that those tilesets have no license.",
            },
            audio: {
                title: "Copyrights of audio files",
                empty: "The map creator did not declare a copyright for audio files. This doesn't mean that those audio files have no license.",
            },
        },
    },
    sub: {
        profile: "Profile",
        settings: "Settings",
        invite: "Invite",
        credit: "Credit",
        globalMessages: "Global Messages",
        contact: "Contact",
    },
};

export default menu;
