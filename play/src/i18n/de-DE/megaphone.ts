import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        selectCamera: "Wählen Sie eine Kamera 📹",
        selectMicrophone: "Wählen Sie ein Mikrofon 🎙️",
        startMegaphone: "Megaphon starten",
    },
};

export default megaphone;
