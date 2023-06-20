import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        selectCamera: "Sélectionnez une caméra 📹",
        selectMicrophone: "Sélectionnez un microphone 🎙️",
        startMegaphone: "Démarrer le mégaphone",
        goingToStream: "Vous allez diffuser",
        yourMicrophone: "votre microphone",
        yourCamera: "votre camera",
        and: "et",
        toAll: "à tous les participants",
        confirm: "Confirmer",
        cancel: "Annuler",
    },
};

export default megaphone;
