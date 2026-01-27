import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Actualitzar",
    title: "La teva llista d'enregistraments",
    noRecordings: "No s'han trobat enregistraments",
    errorFetchingRecordings: "S'ha produït un error en recuperar els enregistraments",
    expireIn: "Caduca en {days} dia{s}",
    download: "Descarregar",
    close: "Tancar",
    ok: "D'acord",
    recordingList: "Enregistraments",
    contextMenu: {
        openInNewTab: "Obrir en una nova pestanya",
        delete: "Eliminar",
    },
    notification: {
        deleteNotification: "Enregistrament eliminat correctament",
        deleteFailedNotification: "Error en eliminar l'enregistrament",
        recordingStarted: "Una persona de la discussió ha començat un enregistrament.",
        downloadFailedNotification: "Error en descarregar l'enregistrament",
        recordingComplete: "Enregistrament completat",
    },
    actionbar: {
        title: {
            start: "Iniciar enregistrament",
            stop: "Aturar enregistrament",
            inpProgress: "Un enregistrament està en curs",
        },
        desc: {
            needLogin: "Has d'estar connectat per enregistrar.",
            needPremium: "Has de ser premium per enregistrar.",
            advert: "Tots els participants seran notificats que estàs iniciant un enregistrament.",
            yourRecordInProgress: "Enregistrament en curs, fes clic per aturar-lo.",
            inProgress: "Un enregistrament està en curs",
            notEnabled: "Els enregistraments estan desactivats per a aquest món.",
        },
    },
};

export default recording;
