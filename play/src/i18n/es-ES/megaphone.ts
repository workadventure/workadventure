import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "Enviar un anuncio",
        audience: "¿Quién lo recibe?",
        thisRoom: "Esta sala",
        wholeWorld: "Todo el mundo",
        place: "Lugar al que unirse (opcional)",
        noPlace: "Ningún lugar",
        noPlaceOnMap: "Este mapa aún no tiene zonas con nombre.",
        preview: "Vista previa",
        sendToRoom: "Enviar a esta sala",
        sendToWorld: "Enviar a todo el mundo",
        confirmWorld: "Todas las salas del mundo lo recibirán.",
        confirmSend: "Sí, enviar a todo el mundo",
        cancel: "Cancelar",
        sentToRoom: "Anuncio enviado a esta sala",
        sentToWorld: "Anuncio enviado a todo el mundo",
        join: "Unirse a {place}",
        joinMap: "Unirse",
        placeNotFound: "Este lugar ya no existe en el mapa.",
        admin: "Administrador",
        more: "Anuncios en espera: {count}",
    },
    modal: {
        liveMessage: {
            microphoneOff: "Micrófono apagado",
            cameraOff: "Cámara apagada",
            cameraOffHint: "Puedes emitir en directo solo con el micrófono.",
            devices: "Cámara y micrófono",
            whoHears: "¿Quién te escucha?",
            thisRoom: "Esta sala",
            wholeWorld: "Todas las salas del mundo",
            live: "En directo",
            stop: "Detener",
            title: "Megáfono",
        },
    },
};

export default megaphone;
