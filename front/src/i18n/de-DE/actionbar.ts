import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    camera: {
        disabled: "Kamera stoppen",
        activate: "Kamera starten",
    },
    microphone: {
        disabled: "Mikrofon einschalten",
        activate: "Mikrofon stummschalten",
    },
    //disableMegaphone: "Megafon deaktivieren",
    //menu: "Menü öffnen / schließen",
    calendar: "Kalender öffnen / schließen",
    mapEditor: "Kartenmanager öffnen / schließen",
    mapEditorMobileLocked: "Karteneditor ist im mobilen Modus gesperrt",
    mapEditorLocked: "Karteneditor ist gesperrt 🔐",
    bo: "Back Office öffnen",
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
    },
};
export default actionbar;
