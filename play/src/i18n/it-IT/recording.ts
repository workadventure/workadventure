import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Aggiorna",
    title: "La tua lista di registrazioni",
    noRecordings: "Nessuna registrazione trovata",
    errorFetchingRecordings: "Si è verificato un errore durante il recupero delle registrazioni",
    expireIn: "Scade tra {days} giorno{s}",
    download: "Scarica",
    close: "Chiudi",
    recordingList: "Registrazioni",
    viewList: "Vista elenco",
    viewCards: "Vista schede",
    noRecordingsHint: "Le registrazioni che avvii appariranno qui una volta terminate.",
    play: "Riproduci la registrazione del {date}",
    deleteConfirm: {
        title: "Eliminare questa registrazione?",
        titleWithDate: "Eliminare la registrazione del {date}?",
        irreversible: "Questa azione non può essere annullata.",
        cancel: "Annulla",
    },
    contextMenu: {
        openInNewTab: "Apri in una nuova scheda",
        delete: "Elimina",
    },
    notification: {
        deleteNotification: "Registrazione eliminata con successo",
        deleteFailedNotification: "Eliminazione della registrazione fallita",
        startFailedNotification: "Avvio della registrazione fallito",
        stopFailedNotification: "Interruzione della registrazione fallita",
        recordingStarted: "{name} ha avviato una registrazione.",
        downloadFailedNotification: "Download della registrazione fallito",
        recordingComplete: "Registrazione completata",
        recordingIsInProgress: "Registrazione in corso",
        unexpectedlyStoppedNotification: "La registrazione si è interrotta in modo imprevisto",
        recordingSaved: "La tua registrazione è stata salvata con successo.",
        howToAccess: "Per accedere alle tue registrazioni:",
        viewRecordings: "Visualizza registrazioni",
    },
    actionbar: {
        title: {
            start: "Avvia registrazione",
            stop: "Ferma registrazione",
            inProgress: "Una registrazione è in corso",
        },
        desc: {
            needLogin: "Devi essere connesso per registrare.",
            advert: "Tutti i partecipanti saranno notificati che stai avviando una registrazione.",
            yourRecordInProgress: "Registrazione in corso, clicca per fermarla.",
            inProgress: "Una registrazione è in corso",
        },
        spacePicker: {
            megaphone: "Registra megafono",
            discussion: "Registra discussione",
        },
    },
};

export default recording;
