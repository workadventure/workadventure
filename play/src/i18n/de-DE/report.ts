import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "Blockieren",
        content: "Blockiere jegliche Kommunikation mit {userName}. Kann jederzeit rückgängig gemacht werden.",
        unblock: "Blockierung für diesen Nutzer aufheben",
        block: "Blockiere diesen Nutzer",
    },
    title: "Melden",
    content: "Verfasse eine Meldung an die Administratoren dieses Raums. Diese können den Nutzer anschließend bannen.",
    message: {
        title: "Deine Nachricht: ",
        empty: "Das Feld darf nicht leer sein.",
        error: "Meldungsfehler melden, Sie können sich an den Administrator wenden.",
    },
    submit: "Diesen Nutzer melden",
    moderate: {
        title: "{userName} moderieren",
        block: "Blockieren",
        report: "Melden",
        noSelect: "FEHLER : Es ist keine Aktion ausgewählt.",
        action: "Moderieren",
        reason: {
            label: "Grund",
            placeholder: "Optional. Wird für die Administratoren dieser Welt gespeichert.",
        },
        adminOnly: "Nur für Admins",
        cancel: "Abbrechen",
        hint: {
            block: "Diese Person nicht mehr sehen und hören. Nur für dich, und umkehrbar.",
            report: "Die Administratoren dieser Welt benachrichtigen.",
            kick: "Jetzt trennen. Die Person kann zurückkommen.",
            ban: "Endgültig trennen.",
        },
        kick: {
            title: "Von der Karte entfernen",
            content: "{userName} wird sofort getrennt und kann später zurückkommen.",
            submit: "Entfernen",
        },
        ban: {
            title: "Aus der Welt verbannen",
            content:
                "{userName} wird getrennt und kann dieser Welt nicht mehr beitreten, auch nicht mit einem anderen Konto.",
            submit: "Verbannen",
            confirmTitle: "{userName} endgültig verbannen?",
            confirmContent:
                "Das lässt sich im Spiel nicht rückgängig machen. Nur ein Administrator kann den Bann im Backoffice aufheben.",
        },
    },
    kicked: {
        title: "ENTFERNT",
        subtitle: "Ein Moderator hat dich von dieser Karte entfernt",
        details: "Lade die Seite neu, um wieder beizutreten.",
    },
    banned: {
        title: "VERBANNT",
        subtitle: "Du wurdest von WorkAdventure verbannt",
        details: "Für weitere Informationen kannst du uns kontaktieren: hello@workadventu.re",
    },
    reasonGiven: "Grund: {reason}",
};

export default report;
