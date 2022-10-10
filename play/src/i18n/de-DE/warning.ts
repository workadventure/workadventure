import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";
import { ADMIN_URL } from "../../front/Enum/EnvironmentVariable";

const upgradeLink = ADMIN_URL + "/pricing";

const warning: DeepPartial<Translation["warning"]> = {
    title: "Warnung!",
    content: `Diese Welt erreicht bald die maximale Kapazität. Du kannst die Kapazität <a href="${upgradeLink}" target="_blank">hier</a> erhöhen`,
    limit: "Diese Welt erreicht bald die maximale Kapazität!",
    accessDenied: {
        camera: "Zugriff auf die Kamera verweigert. Hier klicken um deine Browser Berechtigungen zu prüfen.",
        screenSharing:
            "Zugriff auf die Bildschirmfreigabe verweigert. Hier klicken um deine Browser Berechtigungen zu prüfen.",
        room: "Zutritt nicht gestattet. Dir fehlt die Berechtigung um diesen Raum zu betreten.",
        teleport: "Sie dürfen sich nicht zu diesem Benutzer beamen.",
    },
    importantMessage: "Wichtige Nachricht",
    connectionLost: "Verbindungen unterbrochen. Wiederverbinden...",
    connectionLostTitle: "Verbindungen unterbrochen",
    connectionLostSubtitle: "Wiederverbinden",
    waitingConnectionTitle: "Auf Verbindung warten",
    waitingConnectionSubtitle: "Verbinden",
};

export default warning;
