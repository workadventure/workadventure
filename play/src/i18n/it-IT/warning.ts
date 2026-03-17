import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "Avvertimento!",
    content: `Questo mondo è vicino al suo limite! Puoi aumentare la sua capacità <a href="{upgradeLink}" target="_blank">qui</a>`,
    limit: "Questo mondo è vicino al suo limite!",
    accessDenied: {
        camera: "Accesso alla fotocamera negato. Clicca qui e controlla i permessi del tuo browser.",
        screenSharing: "Condivisione dello schermo negata. Clicca qui e controlla i permessi del tuo browser.",
        teleport: "Non hai il diritto di teletrasportarti a questo utente.",
        room: "Accesso alla stanza negato. Non sei autorizzato ad entrare in questa stanza.",
    },
    importantMessage: "Messaggio importante",
    connectionLost: "Connessione persa. Riconnessione in corso...",
    connectionLostTitle: "Connessione persa",
    connectionLostSubtitle: "Riconnessione in corso",
    waitingConnectionTitle: "In attesa di connessione",
    waitingConnectionSubtitle: "Connessione in corso",
    megaphoneNeeds:
        "Per usare il megafono, devi attivare la tua fotocamera o il tuo microfono o condividere il tuo schermo.",
    mapEditorShortCut: "Si è verificato un errore durante il tentativo di aprire l'editor della mappa.",
    mapEditorNotEnabled: "L'editor della mappa non è abilitato in questo mondo.",
    popupBlocked: {
        title: "Popup bloccato",
        content: "Si prega di consentire i popup per questo sito nelle impostazioni del browser.",
        done: "Ok",
    },
    backgroundProcessing: {
        failedToApply: "Impossibile applicare gli effetti di sfondo",
    },
    browserNotSupported: {
        title: "😢 Browser non supportato",
        message: "Il tuo browser ({browserName}) non è più supportato da WorkAdventure.",
        description:
            "Il tuo browser è troppo vecchio per eseguire WorkAdventure. Si prega di aggiornarlo all'ultima versione per continuare.",
        whatToDo: "Cosa puoi fare?",
        option1: "Aggiornare {browserName} all'ultima versione",
        option2: "Uscire da WorkAdventure e utilizzare un browser diverso",
        updateBrowser: "Aggiorna browser",
        leave: "Esci",
    },
    pwaInstall: {
        title: "Installa WorkAdventure",
        description:
            "Installa l'app per un'esperienza migliore: caricamento più veloce, accesso offline ed esperienza tipo applicazione.",
        descriptionIos: "Aggiungi WorkAdventure alla schermata Home per un'esperienza migliore e accesso rapido.",
        iosStepsTitle: "Come installare",
        iosStep1: "Tocca il pulsante Condividi (quadrato con freccia) in basso in Safari.",
        iosStep2: "Scorri verso il basso e tocca «Aggiungi a Home».",
        iosStep3: "Tocca «Aggiungi» per confermare.",
        install: "Installa PWA WorkAdventure",
        installing: "Installazione…",
        skip: "Continua nel browser",
        continue: "Continua nel browser",
    },
};

export default warning;
