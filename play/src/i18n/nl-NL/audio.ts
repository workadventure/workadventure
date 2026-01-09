import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "Audio volume wijzigen",
    manager: {
        reduce: "Verlaag het volume van de audiospeler tijdens het spreken",
        allow: "Sta audio toe",
        error: "Kon geluid niet laden",
        notAllowed: "▶️ Audio is niet toegestaan. Druk op [SPATIE] of klik hier om het af te spelen!",
    },
    message: "Audiobericht",
    disable: "Schakel je microfoon uit",
};

export default audio;
