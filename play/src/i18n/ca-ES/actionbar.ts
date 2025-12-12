import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    personalDesk: {
        label: "Anar al meu escriptori",
        unclaim: "Alliberar el meu escriptori",
        errorNoUser: "No es poden trobar les vostres dades d'usuari",
        errorNotFound: "Encara no teniu un escriptori personal",
        errorMoving: "No es pot arribar al vostre escriptori personal",
        errorUnclaiming: "No es pot alliberar el vostre escriptori personal",
    },
};

export default actionbar;
