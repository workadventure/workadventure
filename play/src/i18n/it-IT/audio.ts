import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "Modifica il volume dell'audio",
    manager: {
        reduce: "Riduci il volume del lettore audio mentre parli",
        allow: "Consenti audio",
        error: "Impossibile caricare il suono",
        notAllowed: "▶️ L'audio non è consentito. Premi [SPAZIO] o fai clic qui per riprodurlo!",
    },
    message: "Messaggio audio",
    disable: "Spegni il microfono",
};

export default audio;
