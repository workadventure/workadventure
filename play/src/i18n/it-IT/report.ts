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
        action: "Modera",
        reason: {
            label: "Motivo",
            placeholder: "Facoltativo. {userName} vedrà questo messaggio.",
        },
        adminOnly: "Riservato agli amministratori",
        cancel: "Annulla",
        hint: {
            block: "Smetti di vederlo e sentirlo. Solo per te, e reversibile.",
            report: "Avvisa gli amministratori.",
            kick: "Disconnettilo ora. Potrà tornare.",
            ban: "Disconnettilo definitivamente.",
        },
        kick: {
            title: "Rimuovi",
            content: "{userName} viene disconnesso subito, e potrà tornare più tardi.",
            submit: "Rimuovi",
            confirmTitle: "Rimuovi {userName}",
        },
        ban: {
            title: "Bandisci dal mondo",
            content: "{userName} viene disconnesso e non potrà più entrare in questo mondo con questo account.",
            submit: "Bandisci",
            confirmTitle: "Bandire {userName} definitivamente?",
            confirmContent:
                'Un amministratore può revocare il ban in seguito dalla pagina "Utenti bannati" del menu, se disponibile in questo mondo, oppure dal back-office.',
            scope: {
                account: "Questo account",
                ip: "Questo account e il suo indirizzo IP",
                ipHint: "Blocca anche i nuovi account dalla stessa connessione, e tutti quelli che la condividono (un ufficio, una scuola…).",
                ipUnknown: "Non disponibile: questo utente non è più connesso.",
                ipShared: "Non disponibile: condividi questo indirizzo IP e bloccheresti te stesso.",
                loading: "Verifica di chi condivide questo indirizzo IP…",
                error: "Non disponibile: impossibile verificare chi condivide questo indirizzo IP.",
                nobody: "Nessun altro è connesso a questo mondo da questo indirizzo IP in questo momento. Chi tornerà più tardi da questo indirizzo sarà bloccato anche lui.",
                others: "Bloccati anche loro, connessi a questo mondo da questo indirizzo IP in questo momento ({count}):",
                submitWithOthers: "Banna queste {count} persone",
            },
        },
    },
    kicked: {
        title: "RIMOSSO",
        subtitle: "Un moderatore ti ha rimosso da questa mappa",
    },
    banned: {
        title: "BANDITO",
        subtitle: "Sei stato bandito da WorkAdventure",
        details: "Per maggiori informazioni, puoi contattarci a: hello@workadventu.re",
    },
    reasonGiven: "Motivo: {reason}",
};

export default report;
