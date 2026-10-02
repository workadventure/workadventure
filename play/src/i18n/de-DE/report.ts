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
            placeholder: "Optional. {userName} sieht diese Nachricht.",
        },
        adminOnly: "Nur für Admins",
        cancel: "Abbrechen",
        hint: {
            block: "Diese Person nicht mehr sehen und hören. Nur für dich, und umkehrbar.",
            report: "Die Administratoren benachrichtigen.",
            kick: "Jetzt trennen. Die Person kann zurückkommen.",
            ban: "Endgültig trennen.",
        },
        kick: {
            title: "Entfernen",
            content: "{userName} wird sofort getrennt und kann später zurückkommen.",
            submit: "Entfernen",
            confirmTitle: "{userName} entfernen",
        },
        ban: {
            title: "Aus der Welt verbannen",
            content: "{userName} wird getrennt und kann dieser Welt mit diesem Konto nicht mehr beitreten.",
            submit: "Verbannen",
            confirmTitle: "{userName} endgültig verbannen?",
            confirmContent:
                "Ein Administrator kann den Bann später auf der Seite „Gesperrte Benutzer“ im Menü aufheben, falls diese Welt sie anbietet, oder im Backoffice.",
            scope: {
                account: "Dieses Konto",
                ip: "Dieses Konto und seine IP-Adresse",
                ipHint: "Sperrt auch neue Konten über dieselbe Verbindung und alle, die sie teilen (ein Büro, eine Schule…).",
                ipUnknown: "Nicht verfügbar: Dieser Benutzer ist nicht mehr verbunden.",
                ipShared: "Nicht verfügbar: Du teilst diese IP-Adresse und würdest dich selbst aussperren.",
                loading: "Prüfe, wer diese IP-Adresse teilt…",
                error: "Nicht verfügbar: Es konnte nicht geprüft werden, wer diese IP-Adresse teilt.",
                nobody: "Gerade ist niemand sonst von dieser IP-Adresse aus mit dieser Welt verbunden. Wer später von dort zurückkommt, wird ebenfalls gesperrt.",
                others: "Ebenfalls gesperrt, gerade von dieser IP-Adresse aus mit dieser Welt verbunden ({count}):",
                submitWithOthers: "Diese {count} Personen sperren",
            },
        },
    },
    kicked: {
        title: "ENTFERNT",
        subtitle: "Ein Moderator hat dich von dieser Karte entfernt",
    },
    banned: {
        title: "VERBANNT",
        subtitle: "Du wurdest von WorkAdventure verbannt",
        details: "Für weitere Informationen kannst du uns kontaktieren: hello@workadventu.re",
    },
    reasonGiven: "Grund: {reason}",
};

export default report;
