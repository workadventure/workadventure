import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "Reducěrujśo głosnosć audioplayera, gaž powědaśo",
        allow: "Zuk dowóliś",
    },
    message: "Powědana powěsć",
    disable: "Wušaltujśo mikrofon",
};

export default audio;
