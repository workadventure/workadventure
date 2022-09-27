import { DeepPartial } from "../../Utils/DeepPartial";
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
    terms: 'Si continúa, está de acuerdo con nuestros <a href="https://workadventu.re/terms-of-use" target="_blank">términos de uso</a>, <a href="https://workadventu.re/privacy-policy" target="_blank">política de privacidad</a> y <a href="https://workadventu.re/cookie-policy" target="_blank">política de cookie</a>.',
    continue: "Continuar",
};

export default login;
