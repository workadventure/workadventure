import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "Invia un annuncio",
        audience: "Chi lo riceve?",
        thisRoom: "Questa stanza",
        wholeWorld: "Tutto il mondo",
        place: "Luogo da raggiungere (facoltativo)",
        noPlace: "Nessun luogo",
        noPlaceOnMap: "Questa mappa non ha ancora zone con nome.",
        preview: "Anteprima",
        sendToRoom: "Invia a questa stanza",
        sendToWorld: "Invia a tutto il mondo",
        confirmWorld: "Tutte le stanze del mondo lo riceveranno.",
        confirmSend: "Sì, invia a tutto il mondo",
        cancel: "Annulla",
        sentToRoom: "Annuncio inviato a questa stanza",
        sentToWorld: "Annuncio inviato a tutto il mondo",
        join: "Raggiungi {place}",
        joinMap: "Raggiungi",
        placeNotFound: "Questo luogo non esiste più sulla mappa.",
        admin: "Amministratore",
        more: "Annunci in attesa: {count}",
    },
    modal: {
        liveMessage: {
            microphoneOff: "Microfono spento",
            cameraOff: "Videocamera spenta",
            cameraOffHint: "Puoi andare in diretta anche solo con il microfono.",
            devices: "Videocamera e microfono",
            whoHears: "Chi ti sente?",
            thisRoom: "Questa stanza",
            wholeWorld: "Tutte le stanze del mondo",
            live: "In diretta",
            stop: "Ferma",
            startMegaphone: "Avvia megafono",
            stopMegaphone: "Ferma megafono",
            goingToStream: "Stai per trasmettere",
            yourMicrophone: "il tuo microfono",
            yourCamera: "la tua fotocamera",
            yourScreen: "il tuo schermo",
            title: "Messaggio in diretta",
            and: "e",
            toAll: "a tutti i partecipanti",
            settings: "Impostazioni",
        },
    },
};

export default megaphone;
