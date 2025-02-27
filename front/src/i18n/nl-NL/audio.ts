import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "Verlaag het volume van de audiospeler tijdens het spreken",
        allow: "Sta audio toe",
        error: "Kon geluid niet laden",
    },
    message: "Audiobericht",
    disable: "Schakel je microfoon uit",
};

export default audio;
