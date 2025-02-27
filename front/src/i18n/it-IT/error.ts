import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const error: DeepPartial<Translation["error"]> = {
    accessLink: {
        title: "Link di accesso errato",
        subTitle: "Mappa non trovata. Si prega di controllare il link di accesso.",
        details:
            "Se desideri maggiori informazioni, puoi contattare l'amministratore o contattarci a: hello@workadventu.re",
    },
    connectionRejected: {
        title: "Connessione rifiutata",
        subTitle: "Non puoi entrare nel Mondo. Riprova più tardi {error}.",
        details:
            "Se desideri maggiori informazioni, puoi contattare l'amministratore o contattarci a: hello@workadventu.re",
    },
    connectionRetry: {
        unableConnect: "Impossibile connettersi a WorkAdventure. Sei connesso a internet?",
    },
    errorDialog: {
        title: "Errore 😱",
        hasReportIssuesUrl:
            "Se desideri maggiori informazioni, puoi contattare l'amministratore o segnalare un problema a:",
        noReportIssuesUrl: "Se desideri maggiori informazioni, puoi contattare l'amministratore del mondo.",
        messageFAQ: "Puoi anche controllare il nostro:",
        reload: "Ricarica",
        close: "Chiudi",
    },
};

export default error;
