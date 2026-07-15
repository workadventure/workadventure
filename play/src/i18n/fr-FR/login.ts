import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const login: DeepPartial<Translation["login"]> = {
    input: {
        name: {
            placeholder: "Entrez votre nom",
            empty: "Le nom est vide",
            tooLongError: "Le nom est trop long",
            notValidError: "Le nom n'est pas valide",
        },
    },
    genericError: "Une erreur est survenue",
    terms: "En continuant, vous acceptez {links}.",
    termsOfUse: "nos conditions d'utilisation",
    privacyPolicy: "notre politique de confidentialité",
    cookiePolicy: "notre politique relative aux cookies",
    analyticsNotice: "notre notice d'analyse d'audience",
    continue: "Continuer",
};

export default login;
