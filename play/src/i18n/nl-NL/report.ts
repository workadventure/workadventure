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
    },
};

export default report;
