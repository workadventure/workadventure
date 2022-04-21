import { Translation } from "../i18n-types";

const muc: NonNullable<Translation["muc"]> = {
    title: "Liste des utilisateurs",
    userList: {
        disconnected: "Non connecté",
        isHere: "Sur cette map!",
        teleport: "Téléporter",
        search: "Il suffit de chercher !",
    },
    mucRoom: {
        reconnecting: "Connexion au serveur...",
    },
};

export default muc;
