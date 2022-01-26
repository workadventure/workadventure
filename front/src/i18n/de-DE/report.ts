import type { Translation } from "../i18n-types";

const report: NonNullable<Translation["report"]> = {
    block: {
        title: "Blockieren",
        content: "Blockiere jede Kommunikation von und zu {userName}. Kann jederzeit rückgängig gemacht werden.",
        unblock: "Blockierung für diesen User aufheben",
        block: "Blockiere diese User",
    },
    title: "Melden",
    content: "Verfasse eine Meldung an die Administratoren dieses Raums. Diese können den User anschließend bannen.",
    message: {
        title: "Deine Nachricht: ",
        empty: "Bitte einen Text angeben.",
    },
    submit: "Diesen User melden",
    moderate: {
        title: "{userName} moderieren",
        block: "Blockieren",
        report: "Melden",
        noSelect: "FEHLER : Es ist keine Handlung ausgewählt.",
    },
};

export default report;
