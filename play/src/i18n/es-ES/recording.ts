import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Actualizar",
    title: "Tu lista de grabaciones",
    noRecordings: "No se encontraron grabaciones",
    errorFetchingRecordings: "Ocurrió un error al obtener las grabaciones",
    expireIn: "Caduca en {days} día{s}",
    expiresOn: "Caduca el {date}",
    download: "Descargar",
    close: "Cerrar",
    recordingList: "Grabaciones",
    viewList: "Vista de lista",
    viewCards: "Vista de tarjetas",
    back: "Volver",
    actions: "Acciones",
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
            title: "Grabar",
            source: "Qué grabar",
            savedHint: "Se guarda en tus grabaciones al detenerla.",
            megaphone: "Grabar megáfono",
            discussion: "Grabar la discusión",
            withMap: "Diseño del vídeo:",
            camerasOnly: "Solo cámaras",
            camerasOnlyHint:
                "Solo las cámaras, sin el mapa. Este vídeo no se puede dirigir durante la grabación: sin panel de producción ni cambios de diseño o zoom.",
            layout: {
                map: "Primero el mapa",
                balanced: "Equilibrado",
                cameras: "Primero las cámaras",
            },
        },
        producer: {
            preview: "En el vídeo ahora",
            layout: "Diseño",
            zoom: "Zoom",
            zoomLevel: {
                tight: "Cerca",
                wide: "Alejado",
                whole: "Todo el mapa",
            },
            framing: "Encuadre",
            follow: "Seguir la burbuja",
            frameMyView: "Encuadrar lo que veo",
            cameras: "Cámaras",
            pin: "Fijar",
            unpin: "Desfijar",
            pinHint: "Una persona fijada conserva su recuadro aunque se calle (hasta {max}).",
        },
    },
};

export default recording;
