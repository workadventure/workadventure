import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "Blocca",
        content: "Blocca qualsiasi comunicazione da e verso {userName}. Questo può essere annullato.",
        unblock: "Sblocca questo utente",
        block: "Blocca questo utente",
    },
    title: "Segnala",
    content:
        "Invia un messaggio di segnalazione agli amministratori di questa stanza. Potrebbero successivamente bannare questo utente.",
    message: {
        title: "Il tuo messaggio: ",
        empty: "Il messaggio di segnalazione non può essere vuoto.",
        error: "Errore nel messaggio di segnalazione, puoi contattare l'amministratore.",
    },
    submit: "Segnala questo utente",
    moderate: {
        title: "Modera {userName}",
        block: "Blocca",
        report: "Segnala",
        noSelect: "ERRORE: Nessuna azione selezionata.",
    },
};

export default report;
