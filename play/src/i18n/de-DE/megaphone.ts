import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "Ankündigung senden",
        audience: "Wer erhält sie?",
        thisRoom: "Dieser Raum",
        wholeWorld: "Ganze Welt",
        place: "Ort zum Beitreten (optional)",
        noPlace: "Kein Ort",
        noPlaceOnMap: "Diese Karte hat noch keinen benannten Bereich.",
        preview: "Vorschau",
        sendToRoom: "An diesen Raum senden",
        sendToWorld: "An die ganze Welt senden",
        confirmWorld: "Alle Räume der Welt erhalten sie.",
        confirmSend: "Ja, an die ganze Welt senden",
        cancel: "Abbrechen",
        sentToRoom: "Ankündigung an diesen Raum gesendet",
        sentToWorld: "Ankündigung an die ganze Welt gesendet",
        join: "{place} beitreten",
        joinMap: "Beitreten",
        placeNotFound: "Dieser Ort existiert nicht mehr auf der Karte.",
        admin: "Administrator",
        more: "Wartende Ankündigungen: {count}",
    },
    modal: {
        liveMessage: {
            microphoneOff: "Mikrofon aus",
            cameraOff: "Kamera aus",
            cameraOffHint: "Du kannst auch nur mit dem Mikrofon live gehen.",
            devices: "Kamera und Mikrofon",
            whoHears: "Wer hört dich?",
            thisRoom: "Dieser Raum",
            wholeWorld: "Alle Räume der Welt",
            live: "Live",
            stop: "Beenden",
            startMegaphone: "Megaphon starten",
            stopMegaphone: "Megaphon stoppen",
            goingToStream: "Du wirst streamen",
            yourMicrophone: "dein Mikrofon",
            yourCamera: "deine Kamera",
            yourScreen: "deinen Bildschirm",
            title: "Live-Nachricht",
            and: "und",
            toAll: "an alle Teilnehmer",
            settings: "Einstellungen",
        },
    },
};

export default megaphone;
