import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Zapódaj swójo mě",
            empty: "Žedno mě njejo zapódane",
            tooLongError: "Mě jo pśeliš dłujke",
            notValidError: "Mě njejo płaśece",
        },
    },
    terms: "Jolic až kliknjoš na 'dalej', akceptěrujoš {links}.",
    termsOfUse: "Wustawki wužywanja",
    privacyPolicy: "Deklaracija dla woplěwanja datow",
    cookiePolicy: "Regule za placki (cookije)",
    continue: "Dalej",
};

export default login;
