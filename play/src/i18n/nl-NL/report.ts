import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "Blokkeren",
        content: "Blokkeer alle communicatie van en naar {userName}. Dit kan later ongedaan worden gemaakt.",
        unblock: "Deactiveer blokkering van deze gebruiker",
        block: "Blokkeer deze gebruiker",
    },
    title: "Rapporteren",
    content:
        "Stuur een rapportbericht naar de beheerders van deze kamer. Zij kunnen deze gebruiker mogelijk later verbannen.",
    message: {
        title: "Je bericht: ",
        empty: "Rapportbericht mag niet leeg zijn.",
        error: "Fout bij het verzenden van het rapportbericht, je kunt contact opnemen met de beheerder.",
    },
    submit: "Rapporteer deze gebruiker",
    moderate: {
        title: "Modereren {userName}",
        block: "Blokkeren",
        report: "Rapporteren",
        noSelect: "FOUT: Er is geen actie geselecteerd.",
        action: "Modereren",
        reason: {
            label: "Reden",
            placeholder: "Optioneel. {userName} ziet dit bericht.",
        },
        adminOnly: "Alleen voor beheerders",
        cancel: "Annuleren",
        hint: {
            block: "Deze persoon niet meer zien en horen. Alleen voor jou, en omkeerbaar.",
            report: "De beheerders waarschuwen.",
            kick: "Nu verbinding verbreken. De persoon kan terugkomen.",
            ban: "Definitief verbinding verbreken.",
        },
        kick: {
            title: "Verwijderen",
            content: "{userName} wordt meteen losgekoppeld en kan later terugkomen.",
            submit: "Verwijderen",
            confirmTitle: "{userName} verwijderen",
        },
        ban: {
            title: "Verbannen uit de wereld",
            content: "{userName} wordt losgekoppeld en kan deze wereld niet meer betreden met dit account.",
            submit: "Verbannen",
            confirmTitle: "{userName} definitief verbannen?",
            confirmContent:
                "Dit kan niet ongedaan worden gemaakt vanuit het spel. Alleen een beheerder kan de ban opheffen via de backoffice.",
            scope: {
                account: "Dit account",
                ip: "Dit account en het IP-adres",
                ipHint: "Blokkeert ook nieuwe accounts via dezelfde verbinding, en iedereen die die deelt (een kantoor, een school…).",
                ipUnknown: "Niet beschikbaar: deze gebruiker is niet meer verbonden.",
                ipShared: "Niet beschikbaar: je deelt dit IP-adres en zou jezelf buitensluiten.",
                loading: "Controleren wie dit IP-adres deelt…",
                error: "Niet beschikbaar: kon niet controleren wie dit IP-adres deelt.",
                nobody: "Niemand anders is op dit moment vanaf dit IP-adres met deze wereld verbonden. Wie later vanaf dit adres terugkomt, wordt ook buitengesloten.",
                others: "Ook buitengesloten, op dit moment vanaf dit IP-adres met deze wereld verbonden ({count}):",
                submitWithOthers: "Deze {count} personen bannen",
            },
        },
    },
    kicked: {
        title: "VERWIJDERD",
        subtitle: "Een moderator heeft je van deze kaart verwijderd",
    },
    banned: {
        title: "VERBANNEN",
        subtitle: "Je bent verbannen uit WorkAdventure",
        details: "Voor meer informatie kun je contact met ons opnemen via: hello@workadventu.re",
    },
    reasonGiven: "Reden: {reason}",
};

export default report;
