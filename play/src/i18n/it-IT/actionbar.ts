import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "Capito!",
    edit: "Modifica",
    cancel: "Annulla",
    close: "Chiudi",
    login: "Accedi",
    map: "Strumenti",
    profil: "Modifica il tuo nome",
    startScreenSharing: "Inizia condivisione schermo",
    stopScreenSharing: "Ferma condivisione schermo",
    screenSharingMode: "Modalità condivisione schermo",
    calendar: "Calendario",
    todoList: "Lista delle cose da fare",
    woka: "Personalizza il tuo avatar",
    companion: "Aggiungi compagno",
    test: "Testa le mie impostazioni",
    editCamMic: "Modifica camera / microfono",
    allSettings: "Tutte le impostazioni",
    globalMessage: "Invia messaggio globale",
    mapEditor: "Editor mappe",
    mapEditorMobileLocked: "L'editor delle mappe è bloccato in modalità mobile",
    mapEditorLocked: "L'editor delle mappe è bloccato 🔐",
    app: "Applicazioni di terze parti",
    camera: {
        disabled: "La tua fotocamera è disabilitata",
        activate: "Attiva la tua fotocamera",
        noDevices: "Nessun dispositivo fotocamera trovato",
        setBackground: "Imposta sfondo",
        blurEffects: "Effetti sfocatura",
        disableBackgroundEffects: "Disabilita effetti di sfondo",
        close: "Chiudi",
    },
    microphone: {
        disabled: "Il tuo microfono è disabilitato",
        activate: "Attiva il tuo microfono",
        noDevices: "Nessun dispositivo microfono trovato",
    },
    speaker: {
        disabled: "Il tuo altoparlante è disabilitato",
        activate: "Attiva il tuo altoparlante",
        noDevices: "Nessun dispositivo altoparlante trovato",
    },
    status: {
        ONLINE: "Online",
        AWAY: "Assente",
        BACK_IN_A_MOMENT: "Torno subito",
        DO_NOT_DISTURB: "Non disturbare",
        BUSY: "Occupato",
        OFFLINE: "Offline",
        SILENT: "Silenzioso",
        JITSI: "In una riunione",
        BBB: "In una riunione",
        DENY_PROXIMITY_MEETING: "Non disponibile",
        SPEAKER: "In una riunione",
        LIVEKIT: "In una riunione",
        LISTENER: "In una riunione",
    },
    subtitle: {
        camera: "Fotocamera",
        microphone: "Microfono",
        speaker: "Uscita audio",
    },
    help: {
        chat: {
            title: "Invia messaggio di testo",
            desc: "Condividi le tue idee o avvia una discussione, direttamente per iscritto. Semplice, chiaro, efficace.",
        },
        users: {
            title: "Mostra lista utenti",
            desc: "Vedi chi c'è, accedi al loro biglietto da visita, invia loro un messaggio o raggiungili con un clic!",
        },
        emoji: {
            title: "Mostra un emoji",
            desc: "Esprimi come ti senti con un solo clic usando le reazioni emoji. Basta toccare e via!",
        },
        audioManager: {
            title: "Volume dei suoni ambientali",
            desc: "Configura il volume dell'audio facendo clic qui.",
            pause: "Fai clic qui per mettere in pausa l'audio",
            play: "Fai clic qui per riprodurre l'audio",
            stop: "Fai clic qui per fermare l'audio",
        },
        audioManagerNotAllowed: {
            title: "Suoni ambientali bloccati",
            desc: "Il tuo browser ha impedito la riproduzione dei suoni ambientali. Fai clic sull'icona per avviare la riproduzione.",
        },
        follow: {
            title: "Chiedi di seguirti",
            desc: "Puoi chiedere a un utente di seguirti, e se questa richiesta viene accettata, il suo Woka ti seguirà automaticamente, stabilendo così una connessione fluida.",
        },
        unfollow: {
            title: "Smetti di seguire",
            desc: "Puoi scegliere di smettere di seguire un utente in qualsiasi momento. Il tuo Woka smetterà quindi di seguirli, restituendoti la tua libertà di movimento.",
        },
        lock: {
            title: "Blocca conversazione",
            desc: "Abilitando questa funzione, garantisci che nessuno possa unirsi alla discussione. Sei il padrone del tuo spazio, e solo quelli già presenti possono interagire.",
        },
        megaphone: {
            title: "Ferma megafono",
            desc: "Ferma la trasmissione del tuo messaggio a tutti gli utenti.",
        },
        mic: {
            title: "Abilita/disabilita il tuo microfono",
            desc: "Attiva o disattiva il tuo microfono in modo che gli altri possano sentirti durante la discussione.",
        },
        micDisabledByStatus: {
            title: "Microfono disabilitato",
            desc: 'Il tuo microfono è disabilitato perché sei nello stato "{status}".',
        },
        cam: {
            title: "Abilita/disabilita la tua fotocamera",
            desc: "Attiva o disattiva la tua fotocamera per mostrare il tuo video agli altri partecipanti.",
        },
        camDisabledByStatus: {
            title: "Fotocamera disabilitata",
            desc: 'La tua fotocamera è disabilitata perché sei nello stato "{status}".',
        },
        share: {
            title: "Condividi il tuo schermo",
            desc: "Vuoi condividere il tuo schermo con altri utenti? Puoi farlo! Puoi mostrare il tuo schermo a tutti nella chat, e puoi scegliere di condividere l'intero schermo o solo una finestra specifica.",
        },
        apps: {
            title: "Applicazioni di terze parti",
            desc: "Hai la libertà di navigare applicazioni esterne rimanendo nella nostra applicazione, per un'esperienza fluida e arricchita.",
        },
        roomList: {
            title: "Lista delle stanze",
            desc: "Esplora la lista delle stanze per vedere chi è presente e unirti a una conversazione con un clic.",
        },
        calendar: {
            title: "Calendario",
            desc: "Consulta le tue riunioni imminenti e unisciti direttamente da WorkAdventure.",
        },
        todolist: {
            title: "Lista delle cose da fare",
            desc: "Gestisci le tue attività del giorno senza lasciare il tuo spazio di lavoro.",
        },
        pictureInPicture: {
            title: "Picture in picture",
            descDisabled:
                "Sfortunatamente, questa funzionalità non è disponibile sul tuo dispositivo ❌. Prova a utilizzare un altro dispositivo o browser, come Chrome o Edge, per accedere a questa funzionalità.",
            desc: "Puoi utilizzare la funzionalità picture in picture per guardare un video o una presentazione mentre sei in una conversazione. Basta cliccare sull'icona picture in picture e goderti il tuo contenuto.",
        },
    },
    listStatusTitle: {
        enable: "Cambia il tuo stato",
    },
    externalModule: {
        status: {
            onLine: "Lo stato è ok ✅",
            offLine: "Lo stato è offline ❌",
            warning: "Lo stato è un avviso ⚠️",
            sync: "Lo stato è in sincronizzazione 🔄",
        },
    },
    featureNotAvailable: "Funzionalità non disponibile per la tua stanza 😭",
    issueReport: {
        menuAction: "Segnala un problema",
        formTitle: "Segnala un problema",
        emailLabel: "Email (non richiesta)",
        nameLabel: "Nome (non richiesto)",
        descriptionLabel: "Descrizione* (richiesta)",
        descriptionPlaceholder: "Qual è il problema? Cosa ti aspettavi?",
        submitButtonLabel: "Invia segnalazione bug",
        cancelButtonLabel: "Annulla",
        confirmButtonLabel: "Conferma",
        addScreenshotButtonLabel: "Aggiungi uno screenshot",
        removeScreenshotButtonLabel: "Rimuovi screenshot",
        successMessageText: "Grazie per la tua segnalazione! La esamineremo il prima possibile.",
        highlightToolText: "Evidenzia",
        hideToolText: "Nascondi",
        removeHighlightText: "Rimuovi",
    },
    personalDesk: {
        label: "Vai alla mia scrivania",
        unclaim: "Libera la mia scrivania",
        errorNoUser: "Impossibile trovare le informazioni utente",
        errorNotFound: "Non hai ancora una scrivania personale",
        errorMoving: "Impossibile raggiungere la tua scrivania personale",
        errorUnclaiming: "Impossibile liberare la tua scrivania personale",
    },
};

export default actionbar;
