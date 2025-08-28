import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

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
            todoList: "To-Do-Liste öffnen",
        },
    },
    visitCard: {
        close: "Schließen",
        sendMessage: "Nachricht senden",
    },
    profile: {
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
        proximityDiscussionVolume: "Lautstärke für Nähe-Diskussionen",
        blockAudio: "Musik und Hintergrund-Geräusche deaktivieren",
        disableAnimations: "Karten-Animationen deaktivieren",
        bubbleSound: "Blasen-Sound",
        bubbleSoundOptions: {
            ding: "Ding",
            wobble: "Wobble",
        },
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
        matrixIDLabel: "Ihre Matrix-ID",
        settings: "Einstellungen",
        resetKeyStorageUpButtonLabel: "Schlüsselspeicher zurücksetzen",
        resetKeyStorageConfirmationModal: {
            title: "Bestätigung zum Zurücksetzen des Schlüsselspeichers",
            content: "Sie sind dabei, den Schlüsselspeicher zurückzusetzen. Sind Sie sicher?",
            warning:
                "Das Zurücksetzen des Schlüsselspeichers entfernt Ihre aktuelle Sitzung und alle vertrauenswürdigen Benutzer. Sie könnten den Zugang zu einigen vergangenen Nachrichten verlieren und werden nicht mehr als vertrauenswürdiger Benutzer erkannt. Stellen Sie sicher, dass Sie die Konsequenzen dieser Aktion vollständig verstehen, bevor Sie fortfahren.",
            cancel: "Abbrechen",
            continue: "Fortfahren",
        },
    },
    sub: {
        profile: "Profil",
        settings: "Einstellungen",
        invite: "Aktie",
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
        moveUp: "Nach oben bewegen",
        moveDown: "Nach unten bewegen",
        moveLeft: "Nach links bewegen",
        moveRight: "Nach rechts bewegen",
        speedUp: "Rennen",
        interact: "Interagieren",
        follow: "Folgen",
        openChat: "Chat öffnen",
        openUserList: "Benutzerliste öffnen",
        toggleMapEditor: "Karteneditor anzeigen/verstecken",
        rotatePlayer: "Spieler drehen",
        emote1: "Emotion 1",
        emote2: "Emotion 2",
        emote3: "Emotion 3",
        emote4: "Emotion 4",
        emote5: "Emotion 5",
        emote6: "Emotion 6",
        openSayPopup: "Sagen-Popup öffnen",
        openThinkPopup: "Denken-Popup öffnen",
    },
};

export default menu;
