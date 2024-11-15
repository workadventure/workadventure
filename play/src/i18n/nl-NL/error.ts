import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const error: DeepPartial<Translation["error"]> = {
    accessLink: {
        title: "Toegangskoppeling onjuist",
        subTitle: "Kaart niet gevonden. Controleer je toegangskoppeling.",
        details:
            "Als je meer informatie wilt, kun je contact opnemen met de beheerder of ons bereiken via: hello@workadventu.re",
    },
    connectionRejected: {
        title: "Verbinding afgewezen",
        subTitle: "Je kunt de Wereld niet betreden. Probeer het later opnieuw {error}.",
        details:
            "Als je meer informatie wilt, kun je contact opnemen met de beheerder of ons bereiken via: hello@workadventu.re",
    },
    connectionRetry: {
        unableConnect: "Kan geen verbinding maken met WorkAdventure. Ben je verbonden met internet?",
    },
    errorDialog: {
        title: "Fout 😱",
        hasReportIssuesUrl:
            "Als je meer informatie wilt, kun je contact opnemen met de beheerder of een probleem melden via:",
        noReportIssuesUrl: "Als je meer informatie wilt, kun je contact opnemen met de beheerder van de wereld.",
        messageFAQ: "Je kunt ook onze volgende informatie raadplegen:",
        reload: "Opnieuw laden",
        close: "Sluiten",
    },
};

export default error;
