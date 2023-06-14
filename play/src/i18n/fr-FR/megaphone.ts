import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        selectCamera: "Sélectionnez une caméra 📹",
        selectMicrophone: "Sélectionnez un microphone 🎙️",
        startMegaphone: "Démarrer le mégaphone",
    },
};

export default megaphone;
