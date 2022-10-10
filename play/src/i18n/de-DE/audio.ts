import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "Verringern Sie die Lautstärke des Audioplayers während des Sprechens",
        allow: "Ton zulassen",
    },
    message: "Sprachnachricht",
    disable: "Schalten Sie Ihr Mikrofon aus",
};

export default audio;
