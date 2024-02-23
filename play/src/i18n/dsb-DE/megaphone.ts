import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        selectCamera: "Wuzwól kameru 📹",
        selectMicrophone: "Wuzwól mikrofon 🎙️",
        liveMessage: {
            startMegaphone: "Megafon startowaś",
        },
    },
};

export default megaphone;
