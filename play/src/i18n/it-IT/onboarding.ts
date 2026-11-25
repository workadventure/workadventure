import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "Benvenuto su {worldName}! 🚀",
        description:
            "Preparati ad esplorare un mondo virtuale dove puoi muoverti, chattare con altri e collaborare in tempo reale. Facciamo un breve tour per aiutarti a iniziare!",
    },
    movement: {
        title: "Muoversi",
        descriptionDesktop:
            "Usa i tasti freccia o WASD per muovere il tuo personaggio. Puoi anche fare clic destro per muoverti. Prova a muoverti ora!",
        descriptionTouch:
            "Tocca la mappa per raggiungere quel punto e trascina per guardarti intorno. Prova a muoverti ora!",
        next: "Avanti",
    },
    communication: {
        title: "Bolle di comunicazione",
        description:
            "Quando ti avvicini ad altri giocatori, entrerai automaticamente in una bolla di comunicazione. Puoi chattare con altri nella stessa bolla!",
    },
    lockBubble: {
        title: "Blocca la tua conversazione",
        description:
            "Clicca sul pulsante di blocco per impedire ad altri di unirsi alla tua bolla di conversazione. Utile per discussioni private!",
    },
    screenSharing: {
        title: "Condividi il tuo schermo",
        description:
            "Condividi il tuo schermo con altri nella tua bolla di conversazione. Perfetto per presentazioni e collaborazione!",
    },
    pictureInPicture: {
        title: "Immagine nell'immagine",
        description:
            "Usa la modalità Immagine nell'immagine per mantenere visibili le videochiamate mentre navighi sulla mappa. Ottimo per il multitasking!",
    },
    complete: {
        title: "Sei pronto! 🎉",
        description:
            "Hai imparato le basi di {worldName}! Sentiti libero di esplorare, incontrare nuove persone e divertirti. Puoi sempre accedere all'aiuto dal menu se ne hai bisogno.",
    },
    tips: {
        label: "Suggerimento",
        next: "Avanti",
        gotIt: "Ho capito",
        close: "Chiudi",
        stopShowing: "Non mostrare più suggerimenti",
        restartTutorial: "Riavvia il tutorial",
        showMe: "Mostrami",
        notNow: "Non ora",
    },
    announcements: {
        tours: {
            title: "Suggerimenti e tour guidati",
            text: "WorkAdventure ora ti mostra le sue funzioni, un breve suggerimento alla volta. Ritrovali, insieme al tutorial, in **{help}** nelle impostazioni.",
        },
    },
    mapEditorTour: {
        title: "Posiziona arredi con l'editor della mappa",
        openMenu: {
            title: "Rendi tuo questo spazio",
            text: "Puoi modificare questa mappa. Apri il menu **{menu}** per iniziare.",
        },
        openEditor: "Fai clic su **{editor}**.",
        placeObject: {
            title: "Posiziona arredi",
            text: "Scegli un oggetto da questo elenco, poi fai clic sulla mappa per posizionarlo.",
        },
    },
} satisfies Translation["onboarding"];
