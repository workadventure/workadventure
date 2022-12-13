import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const muc: DeepPartial<Translation["muc"]> = {
    title: "wužiwarska lisćina",
    userList: {
        disconnected: "dźělene",
        isHere: "Je tu!",
        teleport: "teleportěrować",
        search: "Wobhladaj sej to prosće!",
        walkTo: "dźi k",
        teleporting: "teleportěrować...",
    },
    mucRoom: {
        reconnecting: "zwisk k prezencnemu serwerej so zhotowi",
    },
};

export default muc;
