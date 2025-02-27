import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "Lautstärke des Audioplayers beim Sprechen verringern",
        allow: "Audio erlauben",
        error: "Sound konnte nicht geladen werden",
    },
    message: "Sprachnachricht",
    disable: "Mikrofon deaktivieren",
};

export default audio;
