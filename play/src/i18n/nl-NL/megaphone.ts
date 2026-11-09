import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "Aankondiging versturen",
        audience: "Wie ontvangt het?",
        thisRoom: "Deze ruimte",
        wholeWorld: "Hele wereld",
        place: "Plek om naartoe te gaan (optioneel)",
        noPlace: "Geen plek",
        noPlaceOnMap: "Deze kaart heeft nog geen benoemde zone.",
        preview: "Voorbeeld",
        sendToRoom: "Naar deze ruimte sturen",
        sendToWorld: "Naar de hele wereld sturen",
        confirmWorld: "Alle ruimtes van de wereld ontvangen het.",
        confirmSend: "Ja, naar de hele wereld sturen",
        cancel: "Annuleren",
        sentToRoom: "Aankondiging naar deze ruimte verstuurd",
        sentToWorld: "Aankondiging naar de hele wereld verstuurd",
        join: "Naar {place}",
        joinMap: "Erheen",
        placeNotFound: "Deze plek bestaat niet meer op de kaart.",
        admin: "Beheerder",
        more: "Wachtende aankondigingen: {count}",
    },
    modal: {
        liveMessage: {
            microphoneOff: "Microfoon uit",
            cameraOff: "Camera uit",
            cameraOffHint: "Je kunt ook alleen met je microfoon live gaan.",
            devices: "Camera en microfoon",
            whoHears: "Wie hoort je?",
            thisRoom: "Deze ruimte",
            wholeWorld: "Alle ruimtes van de wereld",
            live: "Live",
            stop: "Stoppen",
            startMegaphone: "Start megaphone",
            stopMegaphone: "Stop megaphone",
            goingToStream: "Je gaat streamen",
            yourMicrophone: "je microfoon",
            yourCamera: "je camera",
            yourScreen: "je scherm",
            title: "Live bericht",
            and: "en",
            toAll: "naar alle deelnemers",
            settings: "Instellingen",
        },
    },
};

export default megaphone;
