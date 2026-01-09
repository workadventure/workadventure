import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "Verstanden!",
    edit: "Bearbeiten",
    cancel: "Abbrechen",
    close: "Schließen",
    login: "Anmelden",
    map: "Werkzeuge",
    profil: "Ihren Namen bearbeiten",
    startScreenSharing: "Bildschirmfreigabe starten",
    stopScreenSharing: "Bildschirmfreigabe beenden",
    screenSharingMode: "Bildschirmfreigabemodus",
    calendar: "Kalender",
    todoList: "Aufgabenliste",
    woka: "Ihr Avatar anpassen",
    companion: "Begleiter hinzufügen",
    test: "Meine Einstellungen testen",
    editCamMic: "Kamera / Mikrofon bearbeiten",
    allSettings: "Alle Einstellungen",
    globalMessage: "Globale Nachricht senden",
    mapEditor: "Karteneditor",
    mapEditorMobileLocked: "Karteneditor ist im mobilen Modus gesperrt",
    mapEditorLocked: "Karteneditor ist gesperrt 🔐",
    app: "Drittanbieter-Anwendungen",
    camera: {
        disabled: "Ihre Kamera ist deaktiviert",
        activate: "Kamera aktivieren",
        noDevices: "Kein Kameragerät gefunden",
        setBackground: "Hintergrund festlegen",
        blurEffects: "Unschärfeeffekte",
        disableBackgroundEffects: "Hintergrundeffekte deaktivieren",
        close: "Schließen",
    },
    microphone: {
        disabled: "Ihr Mikrofon ist deaktiviert",
        activate: "Mikrofon aktivieren",
        noDevices: "Kein Mikrofon gefunden",
    },
    speaker: {
        disabled: "Ihr Lautsprecher ist deaktiviert",
        activate: "Lautsprecher aktivieren",
        noDevices: "Kein Lautsprecher gefunden",
    },
    status: {
        ONLINE: "Online",
        AWAY: "Abwesend",
        BACK_IN_A_MOMENT: "Bin gleich zurück",
        DO_NOT_DISTURB: "Nicht stören",
        BUSY: "Beschäftigt",
        OFFLINE: "Offline",
        SILENT: "Stumm",
        JITSI: "In einer Besprechung",
        BBB: "In einer Besprechung",
        DENY_PROXIMITY_MEETING: "Nicht verfügbar",
        SPEAKER: "In einer Besprechung",
        LIVEKIT: "In einer Besprechung",
        LISTENER: "In einer Besprechung",
    },
    subtitle: {
        camera: "Kamera",
        microphone: "Mikrofon",
        speaker: "Audioausgabe",
    },
    help: {
        chat: {
            title: "Textnachricht senden",
            desc: "Teilen Sie Ihre Ideen oder starten Sie eine Diskussion, direkt schriftlich. Einfach, klar, effektiv.",
        },
        users: {
            title: "Benutzerliste anzeigen",
            desc: "Sehen Sie, wer da ist, greifen Sie auf ihre Visitenkarte zu, senden Sie ihnen eine Nachricht oder gehen Sie mit einem Klick zu ihnen!",
        },
        emoji: {
            title: "Ein Emoji anzeigen",
            desc: "Drücken Sie mit nur einem Klick Ihre Gefühle mit Emoji-Reaktionen aus. Einfach tippen und los!",
        },
        audioManager: {
            title: "Lautstärke der Umgebungsgeräusche",
            desc: "Konfigurieren Sie die Audio-Lautstärke, indem Sie hier klicken.",
            pause: "Klicken Sie hier, um das Audio anzuhalten",
            play: "Klicken Sie hier, um das Audio abzuspielen",
            stop: "Klicken Sie hier, um das Audio zu stoppen",
        },
        audioManagerNotAllowed: {
            title: "Umgebungsgeräusche blockiert",
            desc: "Ihr Browser hat verhindert, dass Umgebungsgeräusche abgespielt werden. Klicken Sie auf das Symbol, um die Wiedergabe zu starten.",
        },
        follow: {
            title: "Bitten zu folgen",
            desc: "Sie können einen Benutzer bitten, Ihnen zu folgen, und wenn diese Anfrage akzeptiert wird, folgt Ihnen sein Woka automatisch und stellt so eine nahtlose Verbindung her.",
        },
        unfollow: {
            title: "Nicht mehr folgen",
            desc: "Sie können jederzeit wählen, einem Benutzer nicht mehr zu folgen. Ihr Woka wird dann aufhören, ihnen zu folgen, und gibt Ihnen Ihre Bewegungsfreiheit zurück.",
        },
        lock: {
            title: "Unterhaltung sperren",
            desc: "Durch Aktivierung dieser Funktion stellen Sie sicher, dass niemand der Diskussion beitreten kann. Sie sind der Herr Ihres Raums, und nur die bereits Anwesenden können interagieren.",
        },
        megaphone: {
            title: "Megafon stoppen",
            desc: "Stoppen Sie die Übertragung Ihrer Nachricht an alle Benutzer.",
        },
        mic: {
            title: "Mikrofon aktivieren/deaktivieren",
            desc: "Aktivieren oder stummschalten Sie Ihr Mikrofon, damit andere Sie während der Diskussion hören können.",
        },
        micDisabledByStatus: {
            title: "Mikrofon deaktiviert",
            desc: 'Ihr Mikrofon ist deaktiviert, weil Sie sich im Status "{status}" befinden.',
        },
        cam: {
            title: "Kamera aktivieren/deaktivieren",
            desc: "Aktivieren oder deaktivieren Sie Ihre Kamera, um anderen Teilnehmern Ihr Video zu zeigen.",
        },
        camDisabledByStatus: {
            title: "Kamera deaktiviert",
            desc: 'Ihre Kamera ist deaktiviert, weil Sie sich im Status "{status}" befinden.',
        },
        share: {
            title: "Ihren Bildschirm teilen",
            desc: "Möchten Sie Ihren Bildschirm mit anderen Benutzern teilen? Sie können! Sie können Ihren Bildschirm allen im Chat zeigen, und Sie können wählen, ob Sie Ihren gesamten Bildschirm oder nur ein bestimmtes Fenster teilen möchten.",
        },
        apps: {
            title: "Drittanbieter-Anwendungen",
            desc: "Sie haben die Freiheit, externe Anwendungen zu navigieren, während Sie in unserer Anwendung bleiben, für ein reibungsloses und bereichertes Erlebnis.",
        },
        roomList: {
            title: "Raumliste",
            desc: "Durchsuchen Sie die Liste der Räume, um zu sehen, wer anwesend ist, und treten Sie mit einem Klick einer Unterhaltung bei.",
        },
        calendar: {
            title: "Kalender",
            desc: "Sehen Sie sich Ihre bevorstehenden Besprechungen an und treten Sie ihnen direkt von WorkAdventure aus bei.",
        },
        todolist: {
            title: "Aufgabenliste",
            desc: "Verwalten Sie Ihre Aufgaben des Tages, ohne Ihren Arbeitsbereich zu verlassen.",
        },
        pictureInPicture: {
            title: "Bild-im-Bild",
            descDisabled:
                "Leider ist diese Funktion auf Ihrem Gerät nicht verfügbar ❌. Bitte versuchen Sie, ein anderes Gerät oder einen anderen Browser wie Chrome oder Edge zu verwenden, um auf diese Funktion zuzugreifen.",
            desc: "Sie können die Bild-im-Bild-Funktion verwenden, um ein Video oder eine Präsentation anzusehen, während Sie sich in einer Unterhaltung befinden. Klicken Sie einfach auf das Bild-im-Bild-Symbol und genießen Sie Ihren Inhalt.",
        },
    },
    listStatusTitle: {
        enable: "Ändern Sie Ihren Status",
    },
    externalModule: {
        status: {
            onLine: "Status ist ok ✅",
            offLine: "Status ist offline ❌",
            warning: "Status ist Warnung ⚠️",
            sync: "Status wird synchronisiert 🔄",
        },
    },
    featureNotAvailable: "Funktion für Ihren Raum nicht verfügbar 😭",
    issueReport: {
        menuAction: "Ein Problem melden",
        formTitle: "Ein Problem melden",
        emailLabel: "E-Mail (nicht erforderlich)",
        nameLabel: "Name (nicht erforderlich)",
        descriptionLabel: "Beschreibung* (erforderlich)",
        descriptionPlaceholder: "Was ist das Problem? Was haben Sie erwartet?",
        submitButtonLabel: "Fehlerbericht senden",
        cancelButtonLabel: "Abbrechen",
        confirmButtonLabel: "Bestätigen",
        addScreenshotButtonLabel: "Screenshot hinzufügen",
        removeScreenshotButtonLabel: "Screenshot entfernen",
        successMessageText: "Vielen Dank für Ihren Bericht! Wir werden ihn so schnell wie möglich überprüfen.",
        highlightToolText: "Hervorheben",
        hideToolText: "Verstecken",
        removeHighlightText: "Entfernen",
    },
    personalDesk: {
        label: "Zu meinem Schreibtisch gehen",
        unclaim: "Meinen Schreibtisch freigeben",
        errorNoUser: "Benutzerinformationen konnten nicht gefunden werden",
        errorNotFound: "Sie haben noch keinen persönlichen Schreibtisch",
        errorMoving: "Ihr persönlicher Schreibtisch konnte nicht erreicht werden",
        errorUnclaiming: "Ihr persönlicher Schreibtisch konnte nicht freigegeben werden",
    },
};

export default actionbar;
