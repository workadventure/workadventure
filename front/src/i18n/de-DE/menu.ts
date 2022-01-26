import type { Translation } from "../i18n-types";

const menu: NonNullable<Translation["menu"]> = {
    title: "Menu",
    icon: {
        open: {
            menu: "Menu öffnen",
            invite: "Einladung anzeigen",
            register: "Registrieren",
            chat: "Chat öffnen",
        },
    },
    visitCard: {
        close: "Schliessen",
    },
    profile: {
        edit: {
            name: "Deinen Namen ändern",
            woka: "Dein WOKA ändern",
            companion: "Deinen Begleiter ändern",
            camera: "Kameraeinstellungen ändern",
        },
        login: "Einloggen",
        logout: "Ausloggen",
    },
    settings: {
        gameQuality: {
            title: "Spiel Qualität",
            short: {
                high: "Hoch (120 BpS)",
                medium: "Mittel (60 BpS)",
                small: "Gering (40 BpS)",
                minimum: "Minimal (20 BpS)",
            },
            long: {
                high: "Hohe Video Qualität (120 BpS)",
                medium: "Mittlere Video Qualität (60 BpS, empfohlen)",
                small: "Geringe Video Qualität (40 BpS)",
                minimum: "Minimale Video Qualität (20 BpS)",
            },
        },
        videoQuality: {
            title: "Video Qualität",
            short: {
                high: "Hoch (30 BpS)",
                medium: "Mittel (20 BpS)",
                small: "Gering (10 BpS)",
                minimum: "Minimale (5 BpS)",
            },
            long: {
                high: "Hohe Video Qualität (30 BpS)",
                medium: "Mittlere Video Qualität (20 BpS, empfohlen)",
                small: "Geringe Video Qualität (10 BpS)",
                minimum: "Minimale Video Qualität (5 BpS)",
            },
        },
        language: {
            title: "Sprache",
        },
        save: {
            warning: "(Das Spiel wird nach dem Speichern neugestartet)",
            button: "Speichern",
        },
        fullscreen: "Vollbild",
        notifications: "Benachrichtigungen",
        cowebsiteTrigger: "Jedes mal nachfragen bevor Webseiten oder Jitsi Meet Räume geöffnet werden",
        ignoreFollowRequest: "Ignoriere Folgen-Anfragen anderer Nutzer",
    },
    invite: {
        description: "Link zu diesem Raum teilen!",
        copy: "Kopieren",
        share: "Teilen",
    },
    globalMessage: {
        text: "Text",
        audio: "Audio",
        warning: "An alle Räume dieser Welt senden",
        enter: "Trage hier deine Nachricht ein...",
        send: "Senden",
    },
    globalAudio: {
        uploadInfo: "Datei hochladen",
        error: "Keine Datei ausgewählt. Du musst vor dem Versenden eine Datei hochladen.",
    },
    contact: {
        gettingStarted: {
            title: "Erste Schritte",
            description:
                "Mit WorkAdventure kannst du eine Onlinewelt schaffen in der du dich spontan mit Anderen treffen und unterhalten kannst. Erstelle als erstes deine eigene Karte. Es steht dir eine großen Auswahl an vorgefertigten Karten von unserem Team zur Auswahl.",
        },
        createMap: {
            title: "Eigene Karte erstellen ",
            description:
                "Du kannst auch deine eigene Karte erstellen. Folge dazu unserer Schritt-für-Schritt Anleitung.",
        },
    },
    about: {
        mapInfo: "Informationen über diese Karte",
        mapLink: "Link zur Karte",
        copyrights: {
            map: {
                title: "Urheberrecht der Karte",
                empty: "Die Ersteller*In der Karte hat keine Informationen zum Urheberrecht hinterlegt.",
            },
            tileset: {
                title: "Urheberrecht der Tilesets",
                empty: "Die Ersteller*In der Karte hat keine Informationen zum Urheberrecht der Tilesets hinterlegt. Dies bedeutet nicht, dass die Tilesets keiner Lizenz unterliegen.",
            },
            audio: {
                title: "Urheberrecht der Audiodateien",
                empty: "Die Ersteller*In der Karte hat keine Informationen zum Urheberrecht der Audiodateien hinterlegt. Dies bedeutet nicht, dass die Audiodateien keiner Lizenz unterliegen.",
            },
        },
    },
    sub: {
        profile: "Profil",
        settings: "Einstellungen",
        invite: "Einladung",
        credit: "Über die Karte",
        globalMessages: "Globale Nachrichten",
        contact: "Kontakt",
    },
};

export default menu;
