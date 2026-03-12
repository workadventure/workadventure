import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "Lo stato è ok ✅",
        offLine: "Lo stato è offline ❌",
        warning: "Lo stato è di avviso ⚠️",
        sync: "Lo stato sta sincronizzando 🔄",
    },
    teams: {
        openingMeeting: "Apertura riunione Teams...",
        unableJoinMeeting: "Impossibile partecipare alla riunione Teams!",
        userNotConnected: "Non sei sincronizzato con il tuo account Outlook o Google!",
        connectToYourTeams: "Connettiti al tuo account Outlook o Google 🙏",
        temasAppInfo:
            "Teams è un'app Microsoft 365 che aiuta il tuo team a rimanere connesso e organizzato. Puoi chattare, incontrare, chiamare e collaborare tutto in un unico posto 😍",
        buttonSync: "Sincronizza i miei Teams 🚀",
        buttonConnect: "Connetti i miei Teams 🚀",
    },
    discord: {
        integration: "INTEGRAZIONE",
        explainText:
            "Collegando il tuo account Discord qui, potrai ricevere i tuoi messaggi direttamente nella chat di Workadventure. Dopo aver sincronizzato un server, creeremo le stanze che contiene, dovrai solo unirti ad esse nella chat di Workadventure.",
        login: "Connetti a Discord",
        fetchingServer: "Recupero dei tuoi server Discord... 👀",
        qrCodeTitle: "Scansiona il codice QR con la tua app Discord per accedere.",
        qrCodeExplainText:
            "Scansiona il codice QR con la tua app Discord per accedere. I codici QR hanno un tempo limitato, a volte devi rigenerarne uno",
        qrCodeRegenerate: "Ottieni un nuovo codice QR",
        tokenInputLabel: "Token Discord",
        loginToken: "Accedi con token",
        loginTokenExplainText: "Devi inserire il tuo token Discord. Per eseguire l'integrazione Discord vedi",
        sendDiscordToken: "invia",
        tokenNeeded: "Devi inserire il tuo token Discord. Per eseguire l'integrazione Discord vedi",
        howToGetTokenButton: "Come ottenere il mio token di accesso Discord",
        loggedIn: "Connesso con:",
        saveSync: "Salva e sincronizza",
        logout: "Esci",
        back: "Indietro",
        tokenPlaceholder: "Il tuo token Discord",
        loginWithQrCode: "Accedi con codice QR",
        guilds: "Server Discord",
        guildExplain: "Seleziona i canali che desideri aggiungere all'interfaccia chat di Workadventure.\n",
    },
    outlook: {
        signIn: "Accedi con Outlook",
        popupScopeToSync: "Connetti il mio account Outlook",
        popupScopeToSyncExplainText:
            "Dobbiamo connetterci al tuo account Outlook per sincronizzare il tuo calendario e/o le tue attività. Questo ti permetterà di visualizzare le tue riunioni e attività in WorkAdventure e parteciparvi direttamente dalla mappa.",
        popupScopeToSyncCalendar: "Sincronizza il mio calendario",
        popupScopeToSyncTask: "Sincronizza le mie attività",
        popupCancel: "Annulla",
        isSyncronized: "Sincronizzato con Outlook",
        popupScopeIsConnectedExplainText: "Sei già connesso, fai clic sul pulsante per disconnetterti e riconnetterti.",
        popupScopeIsConnectedButton: "Esci",
        popupErrorTitle: "⚠️ La sincronizzazione del modulo Outlook o Teams è fallita",
        popupErrorDescription:
            "La sincronizzazione di inizializzazione del modulo Outlook o Teams è fallita. Per essere connesso, prova a riconnetterti.",
        popupErrorContactAdmin: "Se il problema persiste, contatta il tuo amministratore.",
        popupErrorShowMore: "Mostra più informazioni",
        popupErrorMoreInfo1:
            "Potrebbe esserci un problema con il processo di accesso. Verifica che il provider SSO Azure sia configurato correttamente.",
        popupErrorMoreInfo2:
            'Verifica che l\'ambito "offline_access" sia abilitato per il provider SSO Azure. Questo ambito è necessario per ottenere il token di aggiornamento e mantenere connesso il modulo Teams o Outlook.',
    },
    google: {
        signIn: "Accedi con Google",
        popupScopeToSync: "Connetti il mio account Google",
        popupScopeToSyncExplainText:
            "Dobbiamo connetterci al tuo account Google per sincronizzare il tuo calendario e/o le tue attività. Questo ti permetterà di visualizzare le tue riunioni e attività in WorkAdventure e parteciparvi direttamente dalla mappa.",
        popupScopeToSyncCalendar: "Sincronizza il mio calendario",
        popupScopeToSyncTask: "Sincronizza le mie attività",
        popupCancel: "Annulla",
        isSyncronized: "Sincronizzato con Google",
        popupScopeToSyncMeet: "Crea riunioni online",
        openingMeet: "Apertura Google Meet... 🙏",
        unableJoinMeet: "Impossibile partecipare a Google Meet 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "Creazione del tuo spazio Google… ci vorranno solo pochi secondi 💪",
            guestError: "Non sei connesso, quindi non puoi creare un Google Meet 😭",
            guestExplain:
                "Accedi alla piattaforma per creare un Google Meet, oppure chiedi al proprietario di crearne uno per te 🚀",
            error: "Le impostazioni del tuo Google Workspace non ti consentono di creare un Meet.",
            errorExplain:
                "Nessun problema, puoi comunque partecipare alle riunioni quando qualcun altro condivide un link 🙏",
        },
        popupScopeIsConnectedButton: "Esci",
        popupScopeIsConnectedExplainText: "Sei già connesso, fai clic sul pulsante per disconnetterti e riconnetterti.",
    },
    calendar: {
        title: "Le tue riunioni oggi",
        joinMeeting: "Clicca qui per partecipare alla riunione",
    },
    todoList: {
        title: "Da fare",
        sentence: "Fai una pausa 🙏 magari un caffè o un tè? ☕",
    },
};

export default externalModule;
