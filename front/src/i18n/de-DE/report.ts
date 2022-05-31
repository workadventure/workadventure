import type { Translation } from "../i18n-types";

const report: NonNullable<Translation["report"]> = {
    block: {
        title: "Blockieren",
        content: "Blockiere jegliche Kommunikation mit {userName}. Kann jederzeit rückgängig gemacht werden.",
        unblock: "Blockierung für diesen Nutzer aufheben",
        block: "Blockiere diesen Nutzer",
    },
    ban: {
        title: "Verbannt",
        content: "Benutzer {userName} aus der laufenden Welt bannen. Dies kann aus der Administration gelöscht werden.",
        ban: "Diesen Benutzer sperren",
    },
    title: "Melden",
    content:
        "Verfasse eine Beschwerde an die Administratoren dieses Raums. Diese können den Nutzer anschließend bannen.",
    message: {
        title: "Deine Nachricht: ",
        empty: "Bitte Text eingeben.",
    },
    submit: "Diesen Nutzer melden",
    moderate: {
        title: "{userName} moderieren",
        block: "Blockieren",
        report: "Melden",
        noSelect: "FEHLER : Es ist keine Handlung ausgewählt.",
        ban: "Verbannt"
    },
};

export default report;
