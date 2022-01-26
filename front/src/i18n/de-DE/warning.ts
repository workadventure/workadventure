import type { Translation } from "../i18n-types";

const warning: NonNullable<Translation["warning"]> = {
    title: "Warnung!",
    content:
        'Diese Welt erreicht bald die maximale Kapazität. Du kannst die Kapazität <a href={upgradeLink} target="_blank">hier</a> erhöhen',
    limit: "Diese Welt erreicht bald die maximale Kapazität!",
    accessDenied: {
        camera: "Zugriff auf die Kamera verweigert. Hier klicken um deine Browser Berechtigungen zu prüfen.",
        screenSharing:
            "Zugriff auf die Bildschirmfreigabe verweigert. Hier klicken um deine Browser Berechtigungen zu prüfen.",
    },
    importantMessage: "Wichtige Nachricht",
    connectionLost: "Verbindungen unterbrochen. Wiederverbinden...",
};

export default warning;
