import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "Głosnosć zwuka změniś",
    manager: {
        reduce: "Reducěrujśo głosnosć audioplayera, gaž powědaśo",
        allow: "Zuk dowóliś",
        error: "Zuk njejo se dał zacytaś",
        notAllowed: "▶️ Zuk njejo dowólony. Tłocćo [SPACE] abo klikniśo how, aby se wótgrał!",
    },
    message: "Powědana powěsć",
    disable: "Wušaltujśo mikrofon",
};

export default audio;
