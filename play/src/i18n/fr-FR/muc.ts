import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const muc: DeepPartial<Translation["muc"]> = {
    title: "Liste des utilisateurs",
    userList: {
        disconnected: "Non connecté",
        isHere: "Sur cette map!",
        teleport: "Téléporter",
        search: "Il suffit de chercher !",
        walkTo: "Marcher jusqu'à",
        teleporting: "Téléportation ...",
    },
    mucRoom: {
        reconnecting: "Connexion au serveur...",
    },
};

export default muc;
