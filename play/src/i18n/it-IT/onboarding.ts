import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "Benvenuto su WorkAdventure! 🚀",
        description:
            "Preparati ad esplorare un mondo virtuale dove puoi muoverti, chattare con altri e collaborare in tempo reale. Facciamo un breve tour per aiutarti a iniziare!",
        start: "Iniziamo!",
        skip: "Salta tutorial",
    },
    movement: {
        title: "Muoversi",
        description:
            "Usa i tasti freccia della tastiera o WASD per muovere il tuo personaggio sulla mappa. Prova a muoverti ora!",
        next: "Avanti",
    },
    communication: {
        title: "Bolle di comunicazione",
        description:
            "Quando ti avvicini ad altri giocatori, entrerai automaticamente in una bolla di comunicazione. Puoi chattare con altri nella stessa bolla!",
        video: "./static/Videos/Meet.mp4",
        next: "Capito!",
    },
    lockBubble: {
        title: "Blocca la tua conversazione",
        description:
            "Clicca sul pulsante di blocco per impedire ad altri di unirsi alla tua bolla di conversazione. Utile per discussioni private!",
        video: "./static/Videos/LockBubble.mp4",
        hint: "Clicca sul pulsante di blocco evidenziato per provarlo!",
        next: "Avanti",
    },
    screenSharing: {
        title: "Condividi il tuo schermo",
        description:
            "Condividi il tuo schermo con altri nella tua bolla di conversazione. Perfetto per presentazioni e collaborazione!",
        video: "./static/images/screensharing.mp4",
        hint: "Clicca sul pulsante di condivisione schermo evidenziato per iniziare a condividere!",
        next: "Avanti",
    },
    pictureInPicture: {
        title: "Immagine nell'immagine",
        description:
            "Usa la modalità Immagine nell'immagine per mantenere visibili le videochiamate mentre navighi sulla mappa. Ottimo per il multitasking!",
        video: "./static/Videos/PictureInPicture.mp4",
        hint: "Clicca sul pulsante PiP evidenziato per attivarlo!",
        next: "Avanti",
    },
    complete: {
        title: "Sei pronto! 🎉",
        description:
            "Hai imparato le basi di WorkAdventure! Sentiti libero di esplorare, incontrare nuove persone e divertirti. Puoi sempre accedere all'aiuto dal menu se ne hai bisogno.",
        finish: "Inizia a esplorare!",
    },
} satisfies Translation["onboarding"];
