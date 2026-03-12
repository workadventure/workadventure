import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const error: DeepPartial<Translation["error"]> = {
    accessLink: {
        title: "njepłaćiwy přistupny link",
        subTitle: "Karta njeje so namakała. Pruwuj prošu swój přistupny link.",
        details:
            "Za dalše informacije móžeš so z administratorami skontaktować abo přizjew so pola nas pod: hello@workadventu.re",
    },
    connectionRejected: {
        title: "zwiski wotpokazali",
        subTitle: "Njemóžeš do tuteho swěta zastupić. Spytaj pozdźišo hišće raz {error}.",
        details:
            "Za dalše informacije móžeš so z administratorami skontaktować abo přizjew so pola nas pod: hello@workadventu.re",
    },
    connectionRetry: {
        unableConnect: "Zwisk k serweru je so zhubił. Njemóžeš z druhimi rěčeć.",
    },
    errorDialog: {
        title: "Zmylk 😱",
        hasReportIssuesUrl: "Za dalše informacije móžeš so z administratorami skontaktować abo zmylk podawać pod:",
        noReportIssuesUrl: "Za dalše informacije móžeš so z administratorami swěta skontaktować.",
        messageFAQ: "Móžeš tež do našu FAQ pohladać:",
        reload: "aktualizować",
        close: "začinić",
    },
};

export default error;
