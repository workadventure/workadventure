import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const muc: DeepPartial<Translation["muc"]> = {
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
