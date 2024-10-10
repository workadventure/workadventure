import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const muc: DeepPartial<Translation["muc"]> = {
    title: "ユーザーリスト",
    userList: {
        disconnected: "未接続",
        isHere: "ここにいる！",
        teleport: "テレポート",
        search: "調べてみて！",
        walkTo: "会いに行く",
        teleporting: "テレポート中...",
    },
    mucRoom: {
        reconnecting: "サーバーへ接続中",
    },
};

export default muc;
