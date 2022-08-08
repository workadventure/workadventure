import { DeepPartial } from "../../Utils/DeepPartial";
import { Translation } from "../i18n-types";

const muc: DeepPartial<Translation["muc"]> = {
    title: "Benutzerliste",
    userList: {
        disconnected: "Getrennt",
        isHere: "Ist hier!",
        teleport: "Teleportieren",
        search: "Schau es dir einfach an!",
        walkTo: "Gehen zu",
        teleporting: "Teleportieren ...",
    },
    mucRoom: {
        reconnecting: "Verbindung zum Präsenzserver wird hergestellt",
    },
};

export default muc;
