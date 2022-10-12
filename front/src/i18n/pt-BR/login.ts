import { DeepPartial } from "../../Utils/DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Digite seu nome",
            empty: "O nome está vazio",
        },
    },
    terms: "Ao continuar, você concorda com nossos {links}.",
    termsOfUse: "termos de uso",
    privacyPolicy: "política de privacidade",
    cookiePolicy: "política de cookies",
    continue: "Continuar",
};

export default login;
