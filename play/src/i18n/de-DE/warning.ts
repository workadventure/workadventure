import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "Warnung!",
    content: `Diese Welt erreicht bald die maximale Kapazität. Du kannst die Kapazität <a href="{upgradeLink}" target="_blank">hier</a> erhöhen`,
    limit: "Diese Welt erreicht bald die maximale Kapazität!",
    accessDenied: {
        camera: "Zugriff auf die Kamera verweigert. Hier klicken um deine Browser Berechtigungen zu prüfen.",
        screenSharing:
            "Zugriff auf die Bildschirmfreigabe verweigert. Hier klicken um deine Browser Berechtigungen zu prüfen.",
        room: "Zutritt nicht gestattet. Dir fehlt die Berechtigung um diesen Raum zu betreten.",
        teleport: "Sie dürfen sich nicht zu diesem Benutzer beamen.",
    },
    importantMessage: "Wichtige Nachricht",
    connectionLost: "Verbindungen unterbrochen. Verbindung wiederherstellen...",
    connectionLostTitle: "Verbindungen unterbrochen",
    connectionLostSubtitle: "Verbindung wiederherstellen...",
    waitingConnectionTitle: "Auf Verbindung warten",
    waitingConnectionSubtitle: "Verbinden",
    popupBlocked: {
        title: "Pop-up-Blocker",
        content: "Bitte erlaube Pop-ups für diese Website in den Einstellungen deines Browsers.",
        done: "Ok",
    },
};

export default warning;
