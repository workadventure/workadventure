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
    recordingList: "Grabaciones",
    viewList: "Vista de lista",
    viewCards: "Vista de tarjetas",
    noRecordingsHint: "Las grabaciones que inicies aparecerán aquí cuando terminen.",
    play: "Reproducir la grabación del {date}",
    deleteConfirm: {
        title: "¿Eliminar esta grabación?",
        titleWithDate: "¿Eliminar la grabación del {date}?",
        irreversible: "Esta acción no se puede deshacer.",
        cancel: "Cancelar",
    },
    contextMenu: {
        openInNewTab: "Abrir en nueva pestaña",
        delete: "Eliminar",
    },
    notification: {
        deleteNotification: "Grabación eliminada correctamente",
        deleteFailedNotification: "Error al eliminar la grabación",
        startFailedNotification: "Error al iniciar la grabación",
        stopFailedNotification: "Error al detener la grabación",
        recordingStarted: "{name} ha comenzado una grabación.",
        downloadFailedNotification: "Error al descargar la grabación",
        recordingComplete: "Grabación completada",
        recordingIsInProgress: "Grabación en curso",
        unexpectedlyStoppedNotification: "La grabación se detuvo inesperadamente",
        recordingSaved: "Su grabación se ha guardado correctamente.",
        howToAccess: "Para acceder a sus grabaciones:",
        viewRecordings: "Ver grabaciones",
    },
    actionbar: {
        title: {
            start: "Iniciar grabación",
            stop: "Detener grabación",
            inProgress: "Una grabación está en curso",
        },
        desc: {
            needLogin: "Debes estar conectado para grabar.",
            advert: "Todos los participantes serán notificados de que estás iniciando una grabación.",
            yourRecordInProgress: "Grabación en curso, haz clic para detenerla.",
            inProgress: "Una grabación está en curso",
        },
        spacePicker: {
            megaphone: "Grabar megáfono",
            discussion: "Grabar la discusión",
        },
    },
};

export default recording;
