import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "Wodaj, nimaće přistup k tutej wokrjesu.",
    personalArea: {
        claimDescription: "To je wosobinski wokrjes. Chceće jón swój činić?",
        buttons: {
            yes: "Haj",
            no: "Ně",
        },
        personalSpaceWithNames: "Wosobinski rum {name}",
        alreadyHavePersonalArea: "Maće hižo wosobinski wokrjes. So zhaše, jeli tutón wokrjes přewzaće.",
    },
};

export default area;
