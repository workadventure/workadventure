import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    personalDesk: {
        label: "Ir a mi escritorio",
        unclaim: "Liberar mi escritorio",
        errorNoUser: "No se pueden encontrar sus datos de usuario",
        errorNotFound: "Aún no tiene un escritorio personal",
        errorMoving: "No se puede llegar a su escritorio personal",
        errorUnclaiming: "No se puede liberar su escritorio personal",
    },
    tutorial: {
        helpOpenTutorial: "Ayuda y consejos",
        welcomeOnboard: "¡Bienvenido a bordo!",
    },
};

export default actionbar;
