import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Voer je naam in",
            empty: "De naam is leeg",
            tooLongError: "Naam is te lang",
            notValidError: "Onjuist naamformaat",
        },
    },
    genericError: "Er is een fout opgetreden",
    terms: "Door door te gaan, ga je akkoord met onze {links}.",
    termsOfUse: "gebruikersvoorwaarden",
    privacyPolicy: "privacybeleid",
    cookiePolicy: "cookiebeleid",
    continue: "Doorgaan",
};

export default login;
