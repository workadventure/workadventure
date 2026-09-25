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
            placeholder: "Facoltativo. Conservato per gli amministratori di questo mondo.",
        },
        adminOnly: "Riservato agli amministratori",
        cancel: "Annulla",
        hint: {
            block: "Smetti di vederlo e sentirlo. Solo per te, e reversibile.",
            report: "Avvisa gli amministratori di questo mondo.",
            kick: "Disconnettilo ora. Potrà tornare.",
            ban: "Disconnettilo definitivamente.",
        },
        kick: {
            title: "Rimuovi dalla mappa",
            content: "{userName} viene disconnesso subito, e potrà tornare più tardi.",
            submit: "Rimuovi",
        },
        ban: {
            title: "Bandisci dal mondo",
            content:
                "{userName} viene disconnesso e non potrà più entrare in questo mondo, nemmeno con un altro account.",
            submit: "Bandisci",
            confirmTitle: "Bandire {userName} definitivamente?",
            confirmContent:
                "Non può essere annullato dal gioco. Solo un amministratore può revocare il ban dal back-office.",
        },
    },
    kicked: {
        title: "RIMOSSO",
        subtitle: "Un moderatore ti ha rimosso da questa mappa",
        details: "Ricarica la pagina per rientrare.",
    },
    banned: {
        title: "BANDITO",
        subtitle: "Sei stato bandito da WorkAdventure",
        details: "Per maggiori informazioni, puoi contattarci a: hello@workadventu.re",
    },
    reasonGiven: "Motivo: {reason}",
};

export default report;
