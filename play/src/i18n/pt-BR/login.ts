import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Digite seu nome",
            empty: "O nome está vazio",
            tooLongError: "O nome é muito longo",
            notValidError: "O nome não é válido",
        },
    },
    terms: "Ao continuar, você concorda com nossos {links}.",
    termsOfUse: "termos de uso",
    privacyPolicy: "política de privacidade",
    cookiePolicy: "política de cookies",
    continue: "Continuar",
};

export default login;
