import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "znižće sylnosć zwuka awdioplayera za čas rěčenja",
        allow: "zwuk dowolić",
    },
    message: "rěčna powěsć",
    disable: "hasńće swój mikrofon",
};

export default audio;
