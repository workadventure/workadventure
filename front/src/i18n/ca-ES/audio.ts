import { DeepPartial } from "../../Utils/DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "Baixar el volum de l'audio durant una conversa",
        allow: "Permetre audio",
    },
    message: "Missatge d'audio",
};

export default audio;
