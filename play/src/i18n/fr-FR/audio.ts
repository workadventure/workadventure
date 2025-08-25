import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "Diminuer le volume de l'audio",
    manager: {
        reduce: "Diminuer le volume du lecteur audio dans les conversations",
        allow: "Autoriser l'audio",
        error: "Impossible de charger le son",
        notAllowed: "▶️ L'audio n'est pas autorisé. Appuyez sur [ESPACE] ou cliquez ici pour écouter !",
    },
    message: "Message audio",
    disable: "Couper le microphone",
};

export default audio;
