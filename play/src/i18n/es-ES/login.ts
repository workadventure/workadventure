import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Introduzca su nombre",
            empty: "El nombre está vacío",
            tooLongError: "El nombre es muy largo",
            notValidError: "El nombre no es válido",
        },
    },
    terms: "Si continúa, está de acuerdo con nuestros {links}.",
    termsOfUse: "términos de uso",
    privacyPolicy: "política de privacidad",
    cookiePolicy: "política de cookie",
    continue: "Continuar",
};

export default login;
