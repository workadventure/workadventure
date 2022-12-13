import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

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
        unableConnect: "Njemóžeše so žadyn zwisk k WorkAdventure nastajić. Sy ty z internetom zwjazany?",
    },
    error: "zmylk",
};

export default error;
