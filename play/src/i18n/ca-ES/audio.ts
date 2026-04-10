import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "Canviar el volum de l'àudio",
    manager: {
        reduce: "Baixar el volum de l'audio durant una conversa",
        allow: "Permetre audio",
        error: "No s'ha pogut carregar el so",
        notAllowed: "▶️ L'àudio no està permès. Premeu [ESPAI] o feu clic aquí per reproduir-lo!",
    },
    message: "Missatge d'audio",
    disable: "Apagueu el micròfon",
};

export default audio;
