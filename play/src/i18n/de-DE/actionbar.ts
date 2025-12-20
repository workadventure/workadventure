import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
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
    //disableMegaphone: "Megafon deaktivieren",
    //menu: "Menü öffnen / schließen",
    calendar: "Kalender öffnen / schließen",
    mapEditor: "Kartenmanager öffnen / schließen",
    mapEditorMobileLocked: "Karteneditor ist im mobilen Modus gesperrt",
    mapEditorLocked: "Karteneditor ist gesperrt 🔐",
    subtitle: {
        microphone: "Mikrofon",
        speaker: "Lautsprecher",
    },
    app: "Anwendungen öffnen / schließen",
    listStatusTitle: {
        enable: "Ändere deinen Status",
    },

    status: {
        ONLINE: "Online",
        BACK_IN_A_MOMENT: "Bin gleich zurück",
        DO_NOT_DISTURB: "Nicht stören",
        BUSY: "Beschäftigt",
    },
    globalMessage: "Sende eine globale Nachricht",
    //roomList: "Raumliste öffnen / schließen",
    help: {
        chat: {
            title: "Chat öffnen / schließen",
            //desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        emoji: {
            title: "Emoji öffnen / schließen",
            //desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
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
            title: "Folgen",
        },
        unfollow: {
            title: "Entfolgen",
        },
        lock: {
            title: "Diskussion sperren / entsperren",
        },
        share: {
            title: "Bildschirmfreigabe starten / stoppen",
        },
        pictureInPicture: {
            title: "Bild-im-Bild",
            descDisabled:
                "Leider ist diese Funktion auf Ihrem Gerät nicht verfügbar ❌. Bitte versuchen Sie, ein anderes Gerät oder einen anderen Browser wie Chrome oder Edge zu verwenden, um auf diese Funktion zuzugreifen.",
            desc: "Sie können die Bild-im-Bild-Funktion verwenden, um ein Video oder eine Präsentation anzusehen, während Sie sich in einer Unterhaltung befinden. Klicken Sie einfach auf das Bild-im-Bild-Symbol und genießen Sie Ihren Inhalt.",
        },
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
