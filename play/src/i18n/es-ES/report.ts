import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "Bloquear",
        content: "Bloquear cualquier comunicación desde y hacia {userName}. Este cambio se puede revertir.",
        unblock: "Desbloquear este usuario",
        block: "Bloquear este usuario",
    },
    title: "Reportar",
    content:
        "Enviar un mensaje de reporte a los administradores de esta habitación. Puede que luego suspendan a este usuario.",
    message: {
        title: "Su mensaje: ",
        empty: "El mensaje de reporte no puede estar vacío.",
        error: "Informar mensaje de error, puede contactar al administrador.",
    },
    submit: "Reportar a este usuario",
    moderate: {
        title: "Moderar a {userName}",
        block: "Bloquear",
        report: "Reportar",
        noSelect: "ERROR : No se ha seleccionado una acción.",
        action: "Moderar",
        reason: {
            label: "Motivo",
            placeholder: "Opcional. Se conserva para los administradores de este mundo.",
        },
        adminOnly: "Reservado a los administradores",
        cancel: "Cancelar",
        hint: {
            block: "Dejar de verlo y oírlo. Solo para ti, y reversible.",
            report: "Avisar a los administradores de este mundo.",
            kick: "Desconectarlo ahora. Podrá volver.",
            ban: "Desconectarlo definitivamente.",
        },
        kick: {
            title: "Expulsar del mapa",
            content: "{userName} se desconecta inmediatamente, y podrá volver más tarde.",
            submit: "Expulsar",
        },
        ban: {
            title: "Banear del mundo",
            content: "{userName} se desconecta y no podrá volver a entrar en este mundo, ni siquiera con otra cuenta.",
            submit: "Banear",
            confirmTitle: "¿Banear a {userName} definitivamente?",
            confirmContent:
                "No se puede deshacer desde el juego. Solo un administrador puede levantar el baneo desde el back-office.",
        },
    },
    kicked: {
        title: "EXPULSADO",
        subtitle: "Un moderador te ha expulsado de este mapa",
        details: "Recarga la página para volver a entrar.",
    },
    banned: {
        title: "BANEADO",
        subtitle: "Has sido baneado de WorkAdventure",
        details: "Si quieres más información, puedes contactarnos en: hello@workadventu.re",
    },
    reasonGiven: "Motivo: {reason}",
};

export default report;
