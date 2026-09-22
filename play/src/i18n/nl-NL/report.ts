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
            placeholder: "Optioneel. Bewaard voor de beheerders van deze wereld.",
        },
        adminOnly: "Alleen voor beheerders",
        cancel: "Annuleren",
        hint: {
            block: "Deze persoon niet meer zien en horen. Alleen voor jou, en omkeerbaar.",
            report: "De beheerders van deze wereld waarschuwen.",
            kick: "Nu verbinding verbreken. De persoon kan terugkomen.",
            ban: "Definitief verbinding verbreken.",
        },
        kick: {
            title: "Van de kaart verwijderen",
            content: "{userName} wordt meteen losgekoppeld en kan later terugkomen.",
            submit: "Verwijderen",
        },
        ban: {
            title: "Verbannen uit de wereld",
            content:
                "{userName} wordt losgekoppeld en kan deze wereld niet meer betreden, ook niet met een ander account.",
            submit: "Verbannen",
            confirmTitle: "{userName} definitief verbannen?",
            confirmContent:
                "Dit kan niet ongedaan worden gemaakt vanuit het spel. Alleen een beheerder kan de ban opheffen via de backoffice.",
        },
    },
    kicked: {
        title: "VERWIJDERD",
        subtitle: "Een moderator heeft je van deze kaart verwijderd",
        details: "Herlaad de pagina om opnieuw deel te nemen.",
    },
    banned: {
        title: "VERBANNEN",
        subtitle: "Je bent verbannen uit WorkAdventure",
        details: "Voor meer informatie kun je contact met ons opnemen via: hello@workadventu.re",
    },
    reasonGiven: "Reden: {reason}",
};

export default report;
