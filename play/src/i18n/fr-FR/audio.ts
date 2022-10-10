import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "Diminuer le volume du lecteur audio dans les conversations",
        allow: "Autoriser l'audio",
    },
    message: "Message audio",
    disable: "Couper le microphone",
};

export default audio;
