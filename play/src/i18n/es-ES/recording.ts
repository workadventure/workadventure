import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Actualizar",
    title: "Tu lista de grabaciones",
    noRecordings: "No se encontraron grabaciones",
    errorFetchingRecordings: "Ocurrió un error al obtener las grabaciones",
    expireIn: "Caduca en {days} día{s}",
    download: "Descargar",
    close: "Cerrar",
    ok: "Ok",
    recordingList: "Grabaciones",
    contextMenu: {
        openInNewTab: "Abrir en nueva pestaña",
        delete: "Eliminar",
    },
    notification: {
        deleteNotification: "Grabación eliminada correctamente",
        deleteFailedNotification: "Error al eliminar la grabación",
        recordingStarted: "Una persona en la discusión ha comenzado una grabación.",
        downloadFailedNotification: "Error al descargar la grabación",
    },
    actionbar: {
        title: {
            start: "Iniciar grabación",
            stop: "Detener grabación",
            inProgress: "Una grabación está en curso",
        },
        desc: {
            needLogin: "Debes estar conectado para grabar.",
            needPremium: "Debes ser premium para grabar.",
            advert: "Todos los participantes serán notificados de que estás iniciando una grabación.",
            yourRecordInProgress: "Grabación en curso, haz clic para detenerla.",
            inProgress: "Una grabación está en curso",
            notEnabled: "Las grabaciones están desactivadas para este mundo.",
        },
    },
};

export default recording;
