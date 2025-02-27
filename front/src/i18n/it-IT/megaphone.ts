import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        selectCamera: "Seleziona una fotocamera 📹",
        selectMicrophone: "Seleziona un microfono 🎙️",
        liveMessage: {
            startMegaphone: "Avvia megafono",
            goingToStream: "Stai per trasmettere",
            yourMicrophone: "il tuo microfono",
            yourCamera: "la tua fotocamera",
            yourScreen: "il tuo schermo",
            title: "Messaggio in diretta",
            button: "Avvia messaggio in diretta",
            and: "e",
            toAll: "a tutti i partecipanti",
            confirm: "Conferma",
            cancel: "Annulla",
            notice: `
            Il messaggio in diretta o "Megafono" ti consente di inviare un messaggio in diretta con la tua fotocamera e il tuo microfono a tutte le persone collegate nella stanza o nel mondo.

            Questo messaggio verrà visualizzato nell'angolo inferiore dello schermo, come una videochiamata o una discussione a bolle.

            Un esempio di utilizzo di un messaggio in diretta: "Ciao a tutti, iniziamo la conferenza? 🎉 Segui il mio avatar nell'area conferenze e apri l'app video 🚀"
            `,
            settings: "Impostazioni",
        },
        textMessage: {
            title: "Messaggio di testo",
            notice: `
            Il messaggio di testo ti consente di inviare un messaggio a tutte le persone collegate nella stanza o nel mondo.

            Questo messaggio verrà visualizzato come popup nella parte superiore della pagina e sarà accompagnato da un suono per identificare che l'informazione è leggibile.

            Un esempio di messaggio: "La conferenza nella stanza 3 inizia tra 2 minuti 🎉. Puoi andare nell'area conferenze 3 e aprire l'app video 🚀"
            `,
            button: "Invia un messaggio di testo",
            noAccess: "Non hai accesso a questa funzione 😱 Per favore contatta l'amministratore 🙏",
        },
        audioMessage: {
            title: "Messaggio audio",
            notice: `
            Il messaggio audio è un messaggio di tipo "MP3, OGG..." inviato a tutti gli utenti collegati nella stanza o nel mondo.

            Questo messaggio audio verrà scaricato e avviato a tutte le persone che ricevono questa notifica.

            Un messaggio audio può consistere in una registrazione audio che indica che una conferenza inizierà tra pochi minuti.
            `,
            button: "Invia un messaggio audio",
            noAccess: "Non hai accesso a questa funzione 😱 Per favore contatta l'amministratore 🙏",
        },
    },
};

export default megaphone;
