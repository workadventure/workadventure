import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "Audio-Lautstärke ändern",
    manager: {
        reduce: "Lautstärke des Audioplayers beim Sprechen verringern",
        allow: "Audio erlauben",
        error: "Sound konnte nicht geladen werden",
        notAllowed: "▶️ Audio ist nicht erlaubt. Drücken Sie [LEERTASTE] oder klicken Sie hier, um es abzuspielen!",
    },
    message: "Sprachnachricht",
    disable: "Mikrofon deaktivieren",
};

export default audio;
