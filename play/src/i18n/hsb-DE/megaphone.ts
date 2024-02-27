import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        selectCamera: "Wuzwol kameru 📹",
        selectMicrophone: "Wuzwol mikrofon 🎙️",
        liveMessage: {
            startMegaphone: "Megafon startować",
        },
    },
};

export default megaphone;
