import { Translation } from "../i18n-types";

const muc: NonNullable<Translation["muc"]> = {
    title: "Lista de usuarios",
    userList: {
        disconnected: "No conectado",
        isHere: "¡En este mapa!",
        teleport: "teletransportarse",
        search: "¡Solo busca!",
        walkTo: "Caminar hasta",
        teleporting: "Teletransportación...",
    },
    mucRoom: {
        reconnecting: "Conexión al servidor...",
    },
};

export default muc;
