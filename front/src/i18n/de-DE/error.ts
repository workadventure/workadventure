import type { Translation } from "../i18n-types";

const error: NonNullable<Translation["error"]> = {
    accessLink: {
        title: "Ungültiger Zugangslink",
        subTitle: "Karte konnte nicht gefunden werden. Prüfe bitte deinen Zugangslink.",
        details:
            "Für weitere Information kannst du die Administratoren kontaktieren oder melde dich bei uns unter: hello@workadventu.re",
    },
    connectionRejected: {
        title: "Verbindungen zurückgewiesen",
        subTitle: "Du kannst diese Welt nicht betreten. Versuche es später noch einmal {error}.",
        details:
            "Für weitere Information kannst du die Administratoren kontaktieren oder melde dich bei uns unter: hello@workadventu.re",
    },
    connectionRetry: {
        unableConnect:
            "Es konnte keine Verbindung zu WorkAdventure erstellt werden. Bist du mit dem Internet verbunden?",
    },
    error: "Fehler",
};

export default error;
