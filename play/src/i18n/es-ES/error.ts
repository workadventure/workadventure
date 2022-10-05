import { DeepPartial } from "../../Utils/DeepPartial";
import type { Translation } from "../i18n-types";

const error: DeepPartial<Translation["error"]> = {
    accessLink: {
        title: "Enlace de acceso incorrecto",
        subTitle: "No se encontró el mapa. Por favor, revise su enlace de acceso.",
        details:
            "Si quiere más información, puede contactar con el administrador o contacte con nosotros en: hello@workadventu.re",
    },
    connectionRejected: {
        title: "Conexión rechazada",
        subTitle: "No puede unirse al Mundo. Inténtelo de nuevo más tarde {error}.",
        details:
            "Si quiere más información, puede contactar con el administrador o contacte con nosotros en: hello@workadventu.re",
    },
    connectionRetry: {
        unableConnect: "No se pudo conectar con WorkAdventure. ¿Está conectado a internet?",
    },
    error: "Error",
};

export default error;
