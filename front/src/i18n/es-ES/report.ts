import type { Translation } from "../i18n-types";

const report: NonNullable<Translation["report"]> = {
    block: {
        title: "Bloquear",
        content: "Bloquear cualquier comunicación desde y hacia {userName}. Este cambio se puede revertir.",
        unblock: "Desbloquear este usuario",
        block: "Bloquear este usuario",
    },
    ban: {
        title: "Destierro",
        content: "Usuario van {userName} del mundo en ejecución. Esto puede ser cancelado por la administración.",
        ban: "Prohibir este usuario",
    },
    title: "Reportar",
    content:
        "Enviar un mensaje de reporte a los administradores de esta habitación. Puede que luego suspendan a este usuario.",
    message: {
        title: "Su mensaje: ",
        empty: "El mensaje de reporte no puede estar vacío.",
    },
    submit: "Reportar a este usuario",
    moderate: {
        title: "Moderar a {userName}",
        block: "Bloquear",
        report: "Reportar",
        noSelect: "ERROR : No se ha seleccionado una acción.",
        ban: "Destierro",
    },
};

export default report;
