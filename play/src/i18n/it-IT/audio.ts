import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "Riduci il volume del lettore audio mentre parli",
        allow: "Consenti audio",
        error: "Impossibile caricare il suono",
    },
    message: "Messaggio audio",
    disable: "Spegni il microfono",
};

export default audio;
