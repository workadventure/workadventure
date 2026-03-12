import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        backToSelectCommunication: "Zurück zur Kommunikationsauswahl",
        selectCommunication: "Kommunikation auswählen",
        title: "Globale Kommunikation",
        selectCamera: "Wähle eine Kamera 📹",
        selectMicrophone: "Wähle ein Mikrofon 🎙️",
        liveMessage: {
            startMegaphone: "Megaphon starten",
            stopMegaphone: "Megaphon stoppen",
            goingToStream: "Du wirst streamen",
            yourMicrophone: "dein Mikrofon",
            yourCamera: "deine Kamera",
            yourScreen: "deinen Bildschirm",
            title: "Live-Nachricht",
            button: "Live-Nachricht starten",
            and: "und",
            toAll: "an alle Teilnehmer",
            confirm: "Bestätigen",
            cancel: "Abbrechen",
            notice: `
            Die Live-Nachricht oder "Megaphon" ermöglicht es dir, eine Live-Nachricht mit deiner Kamera und deinem Mikrofon an alle Personen im Raum oder in der Welt zu senden.

            Diese Nachricht wird unten in der Ecke des Bildschirms angezeigt, wie ein Videoanruf oder eine Sprechblase.

            Ein Beispiel für die Verwendung einer Live-Nachricht: "Hallo zusammen, sollen wir die Konferenz starten? 🎉 Folge meinem Avatar zum Konferenzbereich und öffne die Video-App 🚀"
            `,
            settings: "Einstellungen",
        },
        textMessage: {
            title: "Textnachricht",
            notice: `
            Die Textnachricht ermöglicht es dir, eine Nachricht an alle Personen im Raum oder in der Welt zu senden.

            Diese Nachricht wird als Popup oben auf der Seite angezeigt und von einem Ton begleitet, um zu signalisieren, dass die Information lesbar ist.

            Ein Beispiel für eine Nachricht: "Die Konferenz in Raum 3 beginnt in 2 Minuten 🎉. Du kannst zum Konferenzbereich 3 gehen und die Video-App öffnen 🚀"
            `,
            button: "Eine Textnachricht senden",
            noAccess: "Du hast keinen Zugang zu dieser Funktion 😱 Bitte kontaktiere den Administrator 🙏",
        },
        audioMessage: {
            title: "Audionachricht",
            notice: `
            Die Audionachricht ist eine Nachricht vom Typ "MP3, OGG...", die an alle Benutzer im Raum oder in der Welt gesendet wird.

            Diese Audionachricht wird heruntergeladen und an alle Personen gesendet, die diese Benachrichtigung erhalten.

            Eine Audionachricht kann aus einer Audioaufnahme bestehen, die darauf hinweist, dass eine Konferenz in wenigen Minuten beginnt.
            `,
            button: "Eine Audionachricht senden",
            noAccess: "Du hast keinen Zugang zu dieser Funktion 😱 Bitte kontaktiere den Administrator 🙏",
        },
    },
};

export default megaphone;
