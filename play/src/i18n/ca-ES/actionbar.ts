import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    help: {
        audioManager: {
            title: "Volum dels sons ambientals",
            desc: "Configureu el volum d'àudio fent clic aquí.",
            pause: "Feu clic aquí per posar en pausa l'àudio",
            play: "Feu clic aquí per reproduir l'àudio",
            stop: "Feu clic aquí per aturar l'àudio",
        },
        audioManagerNotAllowed: {
            title: "Sons ambientals bloquejats",
            desc: "El vostre navegador ha impedit la reproducció de sons ambientals. Feu clic a la icona per iniciar la reproducció.",
        },
    },
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
