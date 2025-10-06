import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "Verstanden!",
    edit: "Bearbeiten",
    cancel: "Abbrechen",
    close: "Schließen",
    login: "Anmelden",
    map: "Erstellen",
    profil: "Namen bearbeiten",
    startScreenSharing: "Bildschirmfreigabe starten",
    stopScreenSharing: "Bildschirmfreigabe stoppen",
    screenSharingMode: "Bildschirmfreigabe-Modus",
    focusMode: "Fokus-Modus",
    rightMode: "Rechts-Modus",
    hideMode: "Verstecken-Modus",
    lightMode: "Licht-Modus",
    todoList: "To-Do-Liste",
    woka: "Avatar anpassen",
    companion: "Begleiter hinzufügen",
    test: "Einstellungen testen",
    editCamMic: "Kamera / Mikrofon bearbeiten",
    allSettings: "Alle Einstellungen",
    camera: {
        disabled: "Kamera stoppen",
        activate: "Kamera starten",
        noDevices: "Kein Kameragerät gefunden",
    },
    microphone: {
        disabled: "Mikrofon einschalten",
        activate: "Mikrofon stummschalten",
        noDevices: "Kein Mikrofon gefunden",
    },
    speaker: {
        disabled: "Lautsprecher stoppen",
        activate: "Lautsprecher starten",
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
        JITSI: "In einem Meeting",
        BBB: "In einem Meeting",
        DENY_PROXIMITY_MEETING: "Nicht verfügbar",
        SPEAKER: "In einem Meeting",
    },
    subtitle: {
        camera: "Kamera",
        microphone: "Mikrofon",
        speaker: "Lautsprecher",
    },
    help: {
        chat: {
            title: "Chat öffnen / schließen",
            desc: "Teilen Sie Ihre Ideen oder starten Sie eine Diskussion, direkt schriftlich. Einfach, klar, effektiv.",
        },
        users: {
            title: "Benutzerliste anzeigen",
            desc: "Sehen Sie, wer da ist, greifen Sie auf ihre Visitenkarte zu, senden Sie ihnen eine Nachricht oder gehen Sie mit einem Klick zu ihnen!",
        },
        emoji: {
            title: "Emoji anzeigen",
            desc: "Drücken Sie aus, wie Sie sich fühlen, mit nur einem Klick mit Emoji-Reaktionen. Einfach tippen und loslegen!",
        },
        audioManager: {
            title: "Lautstärke der Umgebungsgeräusche",
            desc: "Verwalten Sie die Lautstärke der Hintergrundmusik und Umgebungsgeräusche in Ihrer Umgebung.",
        },
        audioManagerNotAllowed: {
            title: "Umgebungsgeräusche blockiert",
            desc: "Ihr Browser hat verhindert, dass Umgebungsgeräusche abgespielt werden. Klicken Sie auf das Symbol, um Sounds zu starten.",
        },
        follow: {
            title: "Folgen anfragen",
            desc: "Sie können einen Benutzer bitten, Ihnen zu folgen, und wenn diese Anfrage akzeptiert wird, wird ihr Woka Ihnen automatisch folgen und so eine nahtlose Verbindung herstellen.",
        },
        unfollow: {
            title: "Aufhören zu folgen",
            desc: "Sie können jederzeit wählen, einem Benutzer nicht mehr zu folgen. Ihr Woka wird dann aufhören, ihnen zu folgen und Ihnen Ihre Bewegungsfreiheit zurückgeben.",
        },
        lock: {
            title: "Gespräch sperren",
            desc: "Durch Aktivierung dieser Funktion stellen Sie sicher, dass niemand der Diskussion beitreten kann. Sie sind der Herr Ihres Raums und nur die bereits Anwesenden können interagieren.",
        },
        mic: {
            title: "Mikrofon aktivieren/deaktivieren",
            desc: "Steuern Sie Ihr Mikrofon, um an Gesprächen teilzunehmen oder Ihre Privatsphäre zu wahren.",
        },
        micDisabledByStatus: {
            title: "Mikrofon deaktiviert",
            desc: 'Ihr Mikrofon ist deaktiviert, weil Sie im Status "{status}" sind.',
        },
        cam: {
            title: "Kamera aktivieren/deaktivieren",
            desc: "Steuern Sie Ihre Kamera, um sich zu zeigen oder Ihre Privatsphäre zu wahren.",
        },
        camDisabledByStatus: {
            title: "Kamera deaktiviert",
            desc: 'Ihre Kamera ist deaktiviert, weil Sie im Status "{status}" sind.',
        },
        share: {
            title: "Bildschirm teilen",
            desc: "Möchten Sie Ihren Bildschirm mit anderen Benutzern teilen? Das können Sie! Sie können Ihren Bildschirm allen im Chat zeigen und wählen, ob Sie Ihren gesamten Bildschirm oder nur ein bestimmtes Fenster teilen möchten.",
        },
        apps: {
            title: "Drittanbieter-Anwendungen",
            desc: "Sie haben die Freiheit, externe Anwendungen zu navigieren, während Sie in unserer Anwendung bleiben, für eine reibungslose und bereicherte Erfahrung.",
        },
        roomList: {
            title: "Raumliste",
            desc: "Durchsuchen Sie verfügbare Räume und wechseln Sie schnell zwischen verschiedenen Bereichen Ihrer Welt.",
        },
        calendar: {
            title: "Kalender",
            desc: "Verwalten Sie Ihre Termine und sehen Sie anstehende Meetings direkt in WorkAdventure.",
        },
        todolist: {
            title: "To-Do-Liste",
            desc: "Verfolgen Sie Ihre Aufgaben und bleiben Sie organisiert, während Sie in der virtuellen Welt arbeiten.",
        },
    },
    //disableMegaphone: "Megafon deaktivieren",
    //menu: "Menü öffnen / schließen",
    calendar: "Kalender öffnen / schließen",
    mapEditor: "Kartenmanager öffnen / schließen",
    mapEditorMobileLocked: "Karteneditor ist im mobilen Modus gesperrt",
    mapEditorLocked: "Karteneditor ist gesperrt 🔐",
    bo: "Back Office öffnen",
    app: "Anwendungen öffnen / schließen",
    listStatusTitle: {
        enable: "Ändere deinen Status",
    },
    externalModule: {
        status: {
            onLine: "Status ist ok ✅",
            offLine: "Status ist offline ❌",
            warning: "Status ist Warnung ⚠️",
            sync: "Status wird synchronisiert 🔄",
        },
    },
    globalMessage: "Sende eine globale Nachricht",
    //roomList: "Raumliste öffnen / schließen",
    featureNotAvailable: "Funktion für Ihren Raum nicht verfügbar 😭",
};
export default actionbar;
