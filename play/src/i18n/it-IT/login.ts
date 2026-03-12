import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Inserisci il tuo nome",
            empty: "Il nome è vuoto",
            tooLongError: "Il nome è troppo lungo",
            notValidError: "Formato del nome non corretto",
        },
    },
    genericError: "Si è verificato un errore",
    terms: "Continuando, accetti i nostri {links}.",
    termsOfUse: "termini di utilizzo",
    privacyPolicy: "politica sulla privacy",
    cookiePolicy: "politica sui cookie",
    continue: "Continua",
};

export default login;
