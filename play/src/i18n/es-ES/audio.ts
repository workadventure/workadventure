import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "Cambiar el volumen del audio",
    manager: {
        reduce: "Bajar el volumen del audio durante una conversación",
        allow: "Permitir audio",
        error: "No se pudo cargar el sonido",
        notAllowed: "▶️ El audio no está permitido. ¡Presiona [ESPACIO] o haz clic aquí para reproducirlo!",
    },
    message: "Mensaje de audio",
    disable: "Apaga tu micrófono",
};

export default audio;
