import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "Status is ok ✅",
        offLine: "Status is offline ❌",
        warning: "Status is waarschuwing ⚠️",
        sync: "Status wordt gesynchroniseerd 🔄",
    },
};

export default externalModule;
