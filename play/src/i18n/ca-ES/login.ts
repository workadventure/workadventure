import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Introduïu el vostre nombre",
            empty: "El nom està buit",
            tooLongError: "El nom és molt llarg",
            notValidError: "El nom no és vàlid",
        },
    },
    terms: `Si continueu, esteu d'acord amb els nostres {links}.`,
    termsOfUse: "termes d'ús",
    privacyPolicy: "política de privacitat",
    cookiePolicy: "política de cookie",
    continue: "Continuar",
};

export default login;
