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
    error: "Zmólka",
};

export default error;
