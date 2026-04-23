import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Actualizar",
    title: "Tu lista de grabaciones",
    noRecordings: "No se encontraron grabaciones",
    errorFetchingRecordings: "Ocurriรณ un error al obtener las grabaciones",
    expireIn: "Caduca en {days} dรญa{s}",
    expiresOn: "Caduca el {date}",
    download: "Descargar",
    close: "Cerrar",
    recordingList: "Grabaciones",
    viewList: "Vista de lista",
    viewCards: "Vista de tarjetas",
    back: "Volver",
    actions: "Acciones",
    contextMenu: {
        openInNewTab: "Abrir en nueva pestaรฑa",
        delete: "Eliminar",
    },
    notification: {
        deleteNotification: "Grabaciรณn eliminada correctamente",
        deleteFailedNotification: "Error al eliminar la grabaciรณn",
        startFailedNotification: "Error al iniciar la grabaciรณn",
        stopFailedNotification: "Error al detener la grabaciรณn",
        recordingStarted: "{name} ha comenzado una grabaciรณn.",
        downloadFailedNotification: "Error al descargar la grabaciรณn",
        recordingComplete: "Grabaciรณn completada",
        recordingIsInProgress: "Grabaciรณn en curso",
        recordingSaved: "Su grabaciรณn se ha guardado correctamente.",
        howToAccess: "Para acceder a sus grabaciones:",
        viewRecordings: "Ver grabaciones",
    },
    actionbar: {
        title: {
            start: "Iniciar grabaciรณn",
            stop: "Detener grabaciรณn",
            inProgress: "Una grabaciรณn estรก en curso",
        },
        desc: {
            needLogin: "Debes estar conectado para grabar.",
            needPremium: "Debes ser premium para grabar.",
            advert: "Todos los participantes serรกn notificados de que estรกs iniciando una grabaciรณn.",
            yourRecordInProgress: "Grabaciรณn en curso, haz clic para detenerla.",
            inProgress: "Una grabaciรณn estรก en curso",
            notEnabled: "Las grabaciones estรกn desactivadas para este mundo.",
        },
        spacePicker: {
            megaphone: "Grabar megรกfono",
            discussion: "Grabar la discusiรณn",
        },
        layoutPicker: {
            title: "Recording layout",
            subtitle: "Choose how the recording will frame participants.",
            gridLabel: "Grid",
            gridDesc: "Mosaic view with all participants.",
            speakerLabel: "Speaker & screen share",
            speakerDesc: "Large view for the latest screen share or the active speaker; others in a side column.",
            fullscreenLabel: "Fullscreen (LiveKit)",
            fullscreenDesc:
                "One participant at a time using LiveKit VideoTrack (same idea as the official single-speaker layout).",
            confirm: "Start recording",
            cancel: "Cancel",
        },
    },
};

export default recording;
