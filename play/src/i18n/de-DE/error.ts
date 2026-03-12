import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const error: DeepPartial<Translation["error"]> = {
    accessLink: {
        title: "Ungültiger Zugangslink",
        subTitle: "Karte konnte nicht gefunden werden. Prüfe bitte deinen Zugangslink.",
        details:
            "Für weitere Informationen wende dich bitte an die Administratoren oder melde dich bei uns unter: hello@workadventu.re",
    },
    connectionRejected: {
        title: "Verbindungen verweigert",
        subTitle: "Du kannst diese Welt nicht betreten. Versuche es später noch einmal {error}.",
        details:
            "Für weitere Information wende dich bitte an die Administratoren oder melde dich bei uns unter: hello@workadventu.re",
    },
    connectionRetry: {
        unableConnect: "Verbindung zum Server verloren. Du kannst nicht mit anderen sprechen.",
    },
    errorDialog: {
        title: "Fehler 😱",
        hasReportIssuesUrl:
            "Für weitere Informationen wende dich bitte an die Administratoren oder melde einen Fehler unter:",
        noReportIssuesUrl: "Für weitere Informationen wende dich bitte an die Administratoren dieser Welt.",
        messageFAQ: "Du kannst auch unsere FAQ lesen:",
        reload: "Neu laden",
        close: "Schließen",
    },
};

export default error;
