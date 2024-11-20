import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    chat: "Apri / Chiudi chat",
    follow: "Segui",
    unfollow: "Smetti di seguire",
    lock: "Blocca / Sblocca discussione",
    screensharing: "Avvia / Interrompi condivisione dello schermo",
    layout: "Attiva / Disattiva vista a griglia",
    disableLayout: "Non disponibile se c'è solo una persona nella riunione",
    camera: "Avvia / Interrompi fotocamera",
    microphone: "Disattiva / Attiva microfono",
    emoji: "Apri / Chiudi emoji",
    disableMegaphone: "Disattiva megafono",
    menu: "Apri / Chiudi menu",
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
        inMeeting: "Buona riunione 🤓",
        inSilentZone: "Goditi la zona silenziosa 😁",
    },

    status: {
        ONLINE: "Online",
        BACK_IN_A_MOMENT: "Torno subito",
        DO_NOT_DISTURB: "Non disturbare",
        BUSY: "Occupato",
    },
    globalMessage: "Invia un messaggio globale",
    roomList: "Apri / Chiudi lista delle stanze",
    appList: "Apri / Chiudi lista delle applicazioni",
};

export default actionbar;
