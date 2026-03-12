import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

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
        unableConnect: "Se perdió la conexión con el servidor. No podrás hablar con los demás.",
    },
    errorDialog: {
        title: "Error 😱",
        hasReportIssuesUrl:
            "Si quiere más información, puede contactar con el administrador o informar de un problema a:",
        noReportIssuesUrl: "Si quiere más información, puede contactar con el administrador del mundo.",
        messageFAQ: "También puede consultar nuestra:",
        reload: "Recargar",
        close: "Cerrar",
    },
};

export default error;
