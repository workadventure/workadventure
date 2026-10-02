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
            placeholder: "Opcional. {userName} verá este mensaje.",
        },
        adminOnly: "Reservado a los administradores",
        cancel: "Cancelar",
        hint: {
            block: "Dejar de verlo y oírlo. Solo para ti, y reversible.",
            report: "Avisar a los administradores.",
            kick: "Desconectarlo ahora. Podrá volver.",
            ban: "Desconectarlo definitivamente.",
        },
        kick: {
            title: "Expulsar",
            content: "{userName} se desconecta inmediatamente, y podrá volver más tarde.",
            submit: "Expulsar",
            confirmTitle: "Expulsar a {userName}",
        },
        ban: {
            title: "Banear del mundo",
            content: "{userName} se desconecta y no podrá volver a entrar en este mundo con esta cuenta.",
            submit: "Banear",
            confirmTitle: "¿Banear a {userName} definitivamente?",
            confirmContent:
                "Un administrador puede levantar el baneo más tarde desde la página «Usuarios baneados» del menú, si este mundo la tiene, o desde el back-office.",
            scope: {
                account: "Esta cuenta",
                ip: "Esta cuenta y su dirección IP",
                ipHint: "También bloquea las cuentas nuevas desde la misma conexión, y a todos los que la comparten (una oficina, una escuela…).",
                ipUnknown: "No disponible: este usuario ya no está conectado.",
                ipShared: "No disponible: compartes esta dirección IP y te bloquearías a ti mismo.",
                loading: "Comprobando quién comparte esta dirección IP…",
                error: "No disponible: no se pudo comprobar quién comparte esta dirección IP.",
                nobody: "Nadie más está conectado a este mundo desde esta dirección IP ahora mismo. Quien vuelva más tarde desde ella también quedará bloqueado.",
                others: "También bloqueados, conectados a este mundo desde esta dirección IP ahora mismo ({count}):",
                submitWithOthers: "Banear a estas {count} personas",
            },
        },
    },
    kicked: {
        title: "EXPULSADO",
        subtitle: "Un moderador te ha expulsado de este mapa",
    },
    banned: {
        title: "BANEADO",
        subtitle: "Has sido baneado de WorkAdventure",
        details: "Si quieres más información, puedes contactarnos en: hello@workadventu.re",
    },
    reasonGiven: "Motivo: {reason}",
};

export default report;
