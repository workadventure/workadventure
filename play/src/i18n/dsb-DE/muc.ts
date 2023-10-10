import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const muc: DeepPartial<Translation["muc"]> = {
    title: "Lisćina wužywarjow",
    userList: {
        disconnected: "Su wótejšli",
        isHere: "Jo how!",
        teleport: "Teleport",
        search: "Woglědaj kradu!",
        walkTo: "Hyś k",
        teleporting: "Teleportěrowanje...",
    },
    mucRoom: {
        reconnecting: "Zwězanje ze serwerom prezence se twari",
    },
};

export default muc;
