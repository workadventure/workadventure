import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        selectCamera: "Kies een camera 📹",
        selectMicrophone: "Kies een microfoon 🎙️",
        liveMessage: {
            startMegaphone: "Start megaphone",
            goingToStream: "Je gaat streamen",
            yourMicrophone: "je microfoon",
            yourCamera: "je camera",
            yourScreen: "je scherm",
            title: "Live bericht",
            button: "Start live bericht",
            and: "en",
            toAll: "naar alle deelnemers",
            confirm: "Bevestigen",
            cancel: "Annuleren",
            notice: `
            Het live bericht of "Megaphone" stelt je in staat om een live bericht te verzenden met je camera en microfoon naar alle mensen die zijn verbonden in de kamer of de wereld.

            Dit bericht wordt weergegeven in de hoek van het scherm, zoals een video-oproep of een bubbelgesprek.

            Een voorbeeld van een gebruiksscenario voor een live bericht: "Hallo iedereen, zullen we de conferentie starten? 🎉 Volg mijn avatar naar het conferentiegebied en open de video-app 🚀"
            `,
            settings: "Instellingen",
        },
        textMessage: {
            title: "Tekstbericht",
            notice: `
            Het tekstbericht stelt je in staat om een bericht te verzenden naar alle mensen die zijn verbonden in de kamer of de wereld.

            Dit bericht wordt weergegeven als een pop-up bovenaan de pagina en wordt vergezeld door een geluid om aan te geven dat de informatie leesbaar is.

            Een voorbeeld van een bericht: "De conferentie in kamer 3 begint over 2 minuten 🎉. Je kunt naar conferentiegebied 3 gaan en de video-app openen 🚀"
            `,
            button: "Verzend een tekstbericht",
            noAccess: "Je hebt geen toegang tot deze functie 😱 Neem contact op met de beheerder 🙏",
        },
        audioMessage: {
            title: "Audio bericht",
            notice: `
            Het audiobericht is een bericht van het type "MP3, OGG..." dat naar alle gebruikers wordt gestuurd die zijn verbonden in de kamer of in de wereld.

            Dit audiobericht wordt gedownload en afgespeeld bij alle mensen die deze melding ontvangen.

            Een audiobericht kan bestaan uit een audiorecording die aangeeft dat een conferentie over enkele minuten begint.
            `,
            button: "Verzend een audiobericht",
            noAccess: "Je hebt geen toegang tot deze functie 😱 Neem contact op met de beheerder 🙏",
        },
    },
};

export default megaphone;
