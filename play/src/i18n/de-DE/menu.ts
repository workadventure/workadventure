import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const menu: DeepPartial<Translation["menu"]> = {
    title: "Menü",
    icon: {
        open: {
            menu: "Menü öffnen",
            invite: "Einladung anzeigen",
            register: "Registrieren",
            chat: "Chat öffnen",
            userlist: "Benutzerliste",
            openEmoji: "Emoji-Popup öffnen",
            closeEmoji: "Emoji-Menü schließen",
            mobile: "Mobiles Menü öffnen",
            calendar: "Kalender öffnen",
            todoList: "Aufgabenliste öffnen",
        },
    },
    visitCard: {
        close: "Schließen",
        sendMessage: "Nachricht senden",
    },
    profile: {
        login: "Einloggen",
        logout: "Ausloggen",
        helpAndTips: "Hilfe & Tipps",
    },
    settings: {
        proximityDiscussionVolume: "Proximity discussion volume",
        videoBandwidth: {
            title: "Videoqualität",
            low: "Niedrig",
            recommended: "Empfohlen",
            high: "High",
        },
        shareScreenBandwidth: {
            title: "Bildschirmfreigabe-Qualität",
            low: "Niedrig",
            recommended: "Empfohlen",
            high: "High",
        },
        bandwidthConstrainedPreference: {
            title: "Wenn die Netzwerkbandbreite begrenzt ist",
            maintainFramerateTitle: "Flüssige Animationen beibehalten",
            maintainFramerateDescription:
                "Bildrate gegenüber der Auflösung priorisieren. Verwende dies, wenn flüssige Animationen wichtig sind, z. B. beim Streaming von Videospielen.",
            maintainResolutionTitle: "Text lesbar halten",
            maintainResolutionDescription:
                "Auflösung gegenüber der Bildrate priorisieren. Verwende dies, wenn die Lesbarkeit von Text wichtig ist, z. B. in Präsentationen oder beim Teilen von Code.",
            balancedTitle: "Bildrate und Auflösung ausbalancieren",
            balancedDescription: "Versuche, ein Gleichgewicht zwischen Bildrate und Auflösung zu halten.",
        },
        language: {
            title: "Sprache",
        },
        privacySettings: {
            title: "Abwesenheitsmodus",
            explanation: "Falls der WorkAdventure-Tab nicht aktiv ist, wird in den „Abwesenheitsmodus“ umgeschaltet.",
            cameraToggle: "Kamera im „Abwesenheitsmodus“ aktiviert lassen.",
            microphoneToggle: "Mikrofon im „Abwesenheitsmodus“ aktiviert lassen.",
        },
        save: "Speichern",
        otherSettings: "Andere Einstellungen",
        fullscreen: "Vollbild",
        notifications: "Benachrichtigungen",
        enablePictureInPicture: "Bild-in-Bild aktivieren",
        chatSounds: "Chat-Sounds",
        cowebsiteTrigger: "Jedes Mal nachfragen, bevor Webseiten oder Jitsi-Meet-Räume geöffnet werden",
        ignoreFollowRequest: "Folgeanfragen anderer Benutzer ignorieren",
        blockAudio: "Musik und Hintergrund-Geräusche deaktivieren",
        disableAnimations: "Karten-Animationen deaktivieren",
        bubbleSound: "Blasensound",
        bubbleSoundOptions: {
            ding: "Ding",
            wobble: "Wobble",
        },
        displayVideoQualityStats: "Statistiken zur Videoqualität anzeigen",
    },
    invite: {
        description: "Link zu diesem Raum teilen!",
        copy: "Kopieren",
        copied: "Kopiert",
        share: "Teilen",
        walkAutomaticallyToPosition: "Automatisch zu meiner Position gehen",
        selectEntryPoint: "Verwenden Sie einen anderen Einstiegspunkt",
        selectEntryPointSelect: "Wählen Sie den Einstiegspunkt aus, über den die Benutzer ankommen",
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
            "Fehler beim Hochladen der Datei. Bitte überprüfe deine Datei und versuche es erneut. Wenn das Problem weiterhin besteht, wende dich an den Administrator.",
        dragAndDrop: "Datei hierher ziehen oder klicken, um sie hochzuladen 🎧",
    },
    contact: {
        gettingStarted: {
            title: "Erste Schritte",
            description:
                "Mit WorkAdventure kannst du eine Onlinewelt erschaffen, in der du dich spontan mit anderen treffen und unterhalten kannst. Erstelle als erstes deine eigene Karte. Es steht dir eine große Auswahl an vorgefertigten Karten von unserem Team zur Verfügung.",
        },
        createMap: {
            title: "Eigene Karte erstellen",
            description:
                "Du kannst auch deine eigene Karte erstellen. Folge dazu unserer Schritt-für-Schritt-Anleitung.",
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
    chat: {
        matrixIDLabel: "Deine Matrix-ID",
        settings: "Einstellungen",
        resetKeyStorageUpButtonLabel: "Schlüsselspeicher zurücksetzen",
        resetKeyStorageConfirmationModal: {
            title: "Bestätigung zurücksetzen des Schlüsselspeichers",
            content: "Du bist dabei, den Schlüsselspeicher zurückzusetzen. Bist du sicher?",
            warning:
                "Das Zurücksetzen des Schlüsselspeichers entfernt deine aktuelle Sitzung und alle vertrauenswürdigen Benutzer. Du könntest den Zugriff auf einige vergangene Nachrichten verlieren und wirst nicht mehr als vertrauenswürdiger Benutzer erkannt. Stelle sicher, dass du die Konsequenzen dieser Aktion vollständig verstehst, bevor du fortfährst.",
            cancel: "Abbrechen",
            continue: "Fortfahren",
        },
    },
    sub: {
        profile: "Profil",
        settings: "Einstellungen",
        credit: "Über diese Karte",
        globalMessages: "Globale Nachrichten",
        contact: "Kontakt",
        report: "Einen Fehler melden",
        chat: "Chat",
        help: "Hilfe & Tutorials",
        contextualActions: "Kontextuelle Aktionen",
        shortcuts: "Tastenkürzel",
    },
    shortcuts: {
        title: "Tastenkürzel",
        keys: "Tastenkürzel",
        actions: "Aktion",
        moveUp: "Nach oben",
        moveDown: "Nach unten",
        moveLeft: "Nach links",
        moveRight: "Nach rechts",
        speedUp: "Laufen",
        interact: "Interagieren",
        follow: "Folgen",
        openChat: "Chat öffnen",
        openUserList: "Benutzerliste öffnen",
        toggleMapEditor: "Karten-Editor anzeigen/verstecken",
        rotatePlayer: "Spieler drehen",
        emote1: "Emote 1",
        emote2: "Emote 2",
        emote3: "Emote 3",
        emote4: "Emote 4",
        emote5: "Emote 5",
        emote6: "Emote 6",
        openSayPopup: "Sprech-Popup öffnen",
        openThinkPopup: "Denk-Popup öffnen",
        walkMyDesk: "Zu meinem Schreibtisch gehen",
    },
};

export default menu;
