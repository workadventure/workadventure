import { DeepPartial } from "../../Utils/DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "Verringern Sie die Lautstärke des Audioplayers während des Sprechens",
        allow: "Ton zulassen",
    },
    message: "Sprachnachricht",
};

export default audio;
