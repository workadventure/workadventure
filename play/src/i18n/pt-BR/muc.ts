import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const muc: DeepPartial<Translation["muc"]> = {
    title: "Lista de usuários",
    userList: {
        disconnected: "Desconectado",
        isHere: "Está aqui!",
        teleport: "Teleporte",
        search: "Apenas procure!",
        walkTo: "Andar para",
        teleporting: "Teletransporte ...",
    },
    mucRoom: {
        reconnecting: "Conexão ao servidor de presença em andamento",
    },
};

export default muc;
