import type { BaseTranslation } from "../i18n-types";

const login: BaseTranslation = {
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
