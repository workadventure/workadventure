import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "Change audio volume",
    manager: {
        reduce: "Bajar el volumen del audio durante una conversación",
        allow: "Permitir audio",
    },
    message: "Mensaje de audio",
    disable: "Apaga tu micrófono",
};

export default audio;
