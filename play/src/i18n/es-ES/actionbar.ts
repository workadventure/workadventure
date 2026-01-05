import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    help: {
        audioManager: {
            title: "Volumen de sonidos ambientales",
            desc: "Configure el volumen de audio haciendo clic aquí.",
            pause: "Haga clic aquí para pausar el audio",
            play: "Haga clic aquí para reproducir el audio",
            stop: "Haga clic aquí para detener el audio",
        },
        audioManagerNotAllowed: {
            title: "Sonidos ambientales bloqueados",
            desc: "Su navegador ha impedido la reproducción de sonidos ambientales. Haga clic en el icono para iniciar la reproducción.",
        },
    },
    personalDesk: {
        label: "Ir a mi escritorio",
        unclaim: "Liberar mi escritorio",
        errorNoUser: "No se pueden encontrar sus datos de usuario",
        errorNotFound: "Aún no tiene un escritorio personal",
        errorMoving: "No se puede llegar a su escritorio personal",
        errorUnclaiming: "No se puede liberar su escritorio personal",
    },
};

export default actionbar;
