import { DeepPartial } from "../../Utils/DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "Bajar el volumen del audio durante una conversación",
        allow: "Permitir audio",
    },
    message: "Mensaje de audio",
};

export default audio;
