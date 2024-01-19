import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "Menu",
    icon: {
        open: {
            menu: "Menu öffnen",
            invite: "Einladung anzeigen",
            register: "Registrieren",
            chat: "Chat öffnen",
            userlist: "Benutzerliste",
            openEmoji: "Open emoji selected popup",
            closeEmoji: "Close emoji menu",
        },
    },
    visitCard: {
        close: "Schließen",
    },
    profile: {
        edit: {
            name: "Namen ändern",
            woka: "WOKA ändern",
            companion: "Begleiter ändern",
            camera: "Geräteeinstellungen",
        },
        login: "Einloggen",
        logout: "Ausloggen",
    },
    settings: {
        videoBandwidth: {
            title: "Videoqualität",
            low: "Niedrig",
            recommended: "Empfohlen",
            unlimited: "Unbegrenzt",
        },
        shareScreenBandwidth: {
            title: "Bildschirmfreigabe-Qualität",
            low: "Niedrig",
            recommended: "Empfohlen",
            unlimited: "Unbegrenzt",
        },
        language: {
            title: "Sprache",
        },
        privacySettings: {
            title: "Abwesenheitsmodus",
            explanation: "Falls der WorkAdventure Tab nicht aktiv ist, wird in den „Abwesenheitsmodus“ umgeschaltet.",
            cameraToggle: "Kamera im „Abwesenheitsmodus“ aktiviert lassen.",
            microphoneToggle: "Mikrofon im „Abwesenheitsmodus“ aktiviert lassen.",
        },
        save: "Speichern",
        fullscreen: "Vollbild",
        notifications: "Benachrichtigungen",
        cowebsiteTrigger: "Jedes mal nachfragen bevor Webseiten oder Jitsi Meet Räume geöffnet werden",
        ignoreFollowRequest: "Ignoriere Folgen-Anfragen anderer Nutzer",
    },
    invite: {
        description: "Link zu diesem Raum teilen!",
        copy: "Kopieren",
        share: "Teilen",
        walkAutomaticallyToPosition: "Automatisch zu meiner Position gehen",
        selectEntryPoint: "Startpunkt auswählen",
    },
    globalMessage: {
        text: "Text",
        audio: "Audio",
        warning: "An alle Räume in dieser Welt senden",
        enter: "Trage hier deine Nachricht ein...",
        send: "Senden",
    },
    globalAudio: {
        uploadInfo: "Datei hochladen",
        error: "Keine Datei ausgewählt. Du musst vor dem Versenden eine Datei hochladen.",
        errorUpload:
            "Fehler beim Hochladen der Datei. Bitte überprüfen Sie Ihre Datei und versuchen Sie es erneut. Wenn das Problem weiterhin besteht, wenden Sie sich an den Administrator.",
    },
    contact: {
        gettingStarted: {
            title: "Erste Schritte",
            description:
                "Mit WorkAdventure kannst du eine Onlinewelt erschaffen in der du dich spontan mit Anderen treffen und unterhalten kannst. Erstelle als erstes deine eigene Karte. Es steht dir eine große Auswahl an vorgefertigten Karten von unserem Team zur Verfügung.",
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
        credit: "Über diese Karte",
        globalMessages: "Globale Nachrichten",
        contact: "Kontakt",
        report: "Einen Fehler melden",
    },
};

export default menu;
