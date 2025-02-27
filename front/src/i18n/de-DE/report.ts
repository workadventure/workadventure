import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "Blockieren",
        content: "Blockiere jegliche Kommunikation mit {userName}. Kann jederzeit rückgängig gemacht werden.",
        unblock: "Blockierung für diesen Nutzer aufheben",
        block: "Blockiere diesen Nutzer",
    },
    title: "Melden",
    content: "Verfasse eine Meldung an die Administratoren dieses Raums. Diese können den Nutzer anschließend bannen.",
    message: {
        title: "Deine Nachricht: ",
        empty: "Das Feld darf nicht leer sein.",
        error: "Meldungsfehler melden, Sie können sich an den Administrator wenden.",
    },
    submit: "Diesen Nutzer melden",
    moderate: {
        title: "{userName} moderieren",
        block: "Blockieren",
        report: "Melden",
        noSelect: "FEHLER : Es ist keine Aktion ausgewählt.",
    },
};

export default report;
