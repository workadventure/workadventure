import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "Module ok ✅",
        offLine: "Module off ❌",
        warning: "Module error ⚠️",
        sync: "Module en cours de synchro 🔄",
    },
    teams: {
        openingMeeting: "Ouverture de la réunion Teams...",
        unableJoinMeeting: "Impossible de rejoindre la réunion Teams!",
    },
};

export default externalModule;
