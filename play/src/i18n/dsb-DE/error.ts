import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const error: DeepPartial<Translation["error"]> = {
    accessLink: {
        title: "Link za pśistup njejo płaśecy",
        subTitle: "Kórta njejo se namakała. Pśespytuj link za pśistup.",
        details:
            "Dla dalšnych informacijow wobroś se na administratory abo pśipowěź se pla nas pód adresu: hello@workadventu.re",
    },
    connectionRejected: {
        title: "Zwězanje njejo zwólone",
        subTitle: "Ty njamóžoš do togo swěta stupiś. Wopytaj pózdźej hyšći raz {error}.",
        details:
            "Dla dalšnych informacijow wobroś se na administratory abo pśipowěź se pla nas pód adresu: hello@workadventu.re",
    },
    connectionRetry: {
        unableConnect: "Zwězanje z WorkAdventure njejo mógło se natwariś. Wobwěsć se, až sy z internetom zwězany.",
    },
    errorDialog: {
        title: "Zmólka 😱",
        hasReportIssuesUrl:
            "Dla dalšnych informacijow móžoš se z administratorami kontaktěrowaś abo zmólku powdawaś pod:",
        noReportIssuesUrl: "Dla dalšnych informacijow wobroś se na administratory swěta.",
        messageFAQ: "Móžoš teke do našu FAQ poglědaś:",
        reload: "Aktualizowaś",
        close: "Zacyniś",
    },
};

export default error;
