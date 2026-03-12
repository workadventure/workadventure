import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Trage deinen Namen ein",
            empty: "Kein Name angegeben",
            tooLongError: "Der Name ist zu lang",
            notValidError: "Der Name ist ungültig",
        },
    },
    genericError: "Ein Fehler ist aufgetreten",
    terms: "Wenn du fortfährst, akzeptierst du die {links}.",
    termsOfUse: "Nutzungsbedingungen",
    privacyPolicy: "Datenschutzerklärung",
    cookiePolicy: "Cookierichtlinien",
    continue: "Fortfahren",
};

export default login;
