import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const muc: DeepPartial<Translation["muc"]> = {
    title: "Liste des utilisateurs",
    userList: {
        disconnected: "未接続",
        isHere: "ここにいる！",
        teleport: "テレポート",
        search: "調べてみて！",
        walkTo: "歩いて",
        teleporting: "テレポート中...",
    },
    mucRoom: {
        reconnecting: "サーバーへの接続中",
    },
};

export default muc;
