import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    //layout: "Attiva / Disattiva vista a griglia",
    //disableLayout: "Non disponibile se c'è solo una persona nella riunione",
    //disableMegaphone: "Disattiva megafono",
    //menu: "Apri / Chiudi menu",
    calendar: "Apri / Chiudi calendario",
    todoList: "Apri / Chiudi lista delle cose da fare",
    mapEditor: "Apri / Chiudi gestore delle mappe",
    mapEditorMobileLocked: "L'editor delle mappe è bloccato in modalità mobile",
    mapEditorLocked: "L'editor delle mappe è bloccato 🔐",
    bo: "Apri back office",
    subtitle: {
        microphone: "Microfono",
        speaker: "Altoparlante",
    },
    app: "Apri / Chiudi applicazioni",
    listStatusTitle: {
        enable: "Cambia il tuo stato",
    },

    status: {
        ONLINE: "Online",
        BACK_IN_A_MOMENT: "Torno subito",
        DO_NOT_DISTURB: "Non disturbare",
        BUSY: "Occupato",
    },
    globalMessage: "Invia un messaggio globale",
    //roomList: "Apri / Chiudi lista delle stanze",
    //appList: "Apri / Chiudi lista delle applicazioni",
    help: {
        mic: {
            title: "Disattiva / Attiva microfono",
        },
        cam: {
            title: "Avvia / Interrompi fotocamera",
        },
        chat: {
            title: "Apri / Chiudi chat",
        },
        follow: {
            title: "Segui",
        },
        unfollow: {
            title: "Smetti di seguire",
        },
        lock: {
            title: "Blocca / Sblocca discussione",
        },
        share: {
            title: "Avvia / Interrompi condivisione dello schermo",
        },
        emoji: {
            title: "Apri / Chiudi emoji",
        },
    },
};

export default actionbar;
