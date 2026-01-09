import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "sylnosć zwuka změnić",
    manager: {
        reduce: "znižće sylnosć zwuka awdioplayera za čas rěčenja",
        allow: "zwuk dowolić",
        error: "zwuk njeda so začitać",
        notAllowed: "▶️ Zwuk njeje dowoleny. Tłóčće [SPACE] abo klikńće tu, zo by so wothrał!",
    },
    message: "rěčna powěsć",
    disable: "hasńće swój mikrofon",
};

export default audio;
