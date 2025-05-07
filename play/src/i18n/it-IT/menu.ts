import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "Menu",
    icon: {
        open: {
            menu: "Apri menu",
            invite: "Mostra invito",
            register: "Registrati",
            chat: "Apri chat",
            userlist: "Lista utenti",
            openEmoji: "Apri popup selezione emoji",
            closeEmoji: "Chiudi menu emoji",
            mobile: "Apri menu mobile",
            calendar: "Apri calendario",
            todoList: "Apri lista delle cose da fare",
        },
    },
    visitCard: {
        close: "Chiudi",
        sendMessage: "Invia messaggio",
    },
    profile: {
        login: "Accedi",
        logout: "Esci",
    },
    settings: {
        videoBandwidth: {
            title: "Qualità video",
            low: "Bassa",
            recommended: "Consigliata",
            unlimited: "Illimitata",
        },
        shareScreenBandwidth: {
            title: "Qualità condivisione schermo",
            low: "Bassa",
            recommended: "Consigliata",
            unlimited: "Illimitata",
        },
        language: {
            title: "Lingua",
        },
        privacySettings: {
            title: "Modalità assente",
            explanation:
                'Quando la scheda WorkAdventure nel tuo browser non è visibile, WorkAdventure passa alla modalità "assente"',
            cameraToggle: 'Mantieni la fotocamera attiva in modalità "assente"',
            microphoneToggle: 'Mantieni il microfono attivo in modalità "assente"',
        },
        save: "Salva",
        otherSettings: "Altre impostazioni",
        fullscreen: "Schermo intero",
        notifications: "Notifiche",
        chatSounds: "Suoni chat",
        cowebsiteTrigger: "Chiedi sempre prima di aprire siti web e stanze Jitsi Meet",
        ignoreFollowRequest: "Ignora richieste di seguire altri utenti",
        proximityDiscussionVolume: "Volume discussione di prossimità",
        blockAudio: "Blocca suoni ambientali e musica",
        disableAnimations: "Disabilita animazioni delle tessere della mappa",
    },
    invite: {
        description: "Condividi il link della stanza!",
        copy: "Copia",
        share: "Condividi",
        walkAutomaticallyToPosition: "Cammina automaticamente alla mia posizione",
        selectEntryPoint: "Seleziona un punto di ingresso",
    },
    globalMessage: {
        text: "Testo",
        audio: "Audio",
        warning: "Trasmetti a tutte le stanze del mondo",
        enter: "Inserisci il tuo messaggio qui...",
        send: "Invia",
    },
    globalAudio: {
        uploadInfo: "Carica un file",
        error: "Nessun file selezionato. Devi caricare un file prima di inviarlo.",
        errorUpload:
            "Errore di caricamento del file. Controlla il tuo file e riprova. Se il problema persiste, contatta l'amministratore.",
        dragAndDrop: "Trascina e rilascia o clicca qui per caricare il tuo file 🎧",
    },
    contact: {
        gettingStarted: {
            title: "Iniziare",
            description:
                "WorkAdventure ti permette di creare uno spazio online per comunicare spontaneamente con gli altri. E tutto inizia con la creazione del tuo spazio. Scegli tra una vasta selezione di mappe prefabbricate dal nostro team.",
        },
        createMap: {
            title: "Crea la tua mappa",
            description: "Puoi anche creare la tua mappa personalizzata seguendo i passaggi della documentazione.",
        },
    },
    about: {
        mapInfo: "Informazioni sulla mappa",
        mapLink: "link a questa mappa",
        copyrights: {
            map: {
                title: "Copyright della mappa",
                empty: "Il creatore della mappa non ha dichiarato un copyright per la mappa.",
            },
            tileset: {
                title: "Copyright dei tileset",
                empty: "Il creatore della mappa non ha dichiarato un copyright per i tileset. Questo non significa che quei tileset non abbiano una licenza.",
            },
            audio: {
                title: "Copyright dei file audio",
                empty: "Il creatore della mappa non ha dichiarato un copyright per i file audio. Questo non significa che quei file audio non abbiano una licenza.",
            },
        },
    },
    chat: {
        matrixIDLabel: "Il tuo ID Matrix",
        settings: "Impostazioni",
        resetKeyStorageUpButtonLabel: "Reimposta il tuo archivio chiavi",
        resetKeyStorageConfirmationModal: {
            title: "Conferma reimpostazione archivio chiavi",
            content: "Stai per reimpostare l'archivio chiavi. Sei sicuro?",
            warning:
                "Reimpostare l'archivio chiavi rimuoverà la tua sessione corrente e tutti gli utenti fidati. Potresti perdere l'accesso ad alcuni messaggi passati e non sarai più riconosciuto come utente fidato. Assicurati di comprendere appieno le conseguenze di questa azione prima di procedere.",
            cancel: "Annulla",
            continue: "Continua",
        },
    },
    sub: {
        profile: "Profilo",
        settings: "Impostazioni",
        invite: "Invito",
        credit: "Credito",
        globalMessages: "Messaggi globali",
        contact: "Contatto",
        report: "Segnala problemi",
        chat: "Chat",
    },
};

export default menu;
