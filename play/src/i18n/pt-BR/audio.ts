import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "Diminua o volume do player de áudio enquanto fala",
        allow: "Permitir áudio",
    },
    message: "Mensagem de áudio",
    disable: "Desligue seu microfone",
};

export default audio;
