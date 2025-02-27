import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "警告!",
    content:
        'このワールドは限界に近づいています。<a href="{upgradeLink}" target="_blank">ここ</a>から容量をアップグレードできます。',
    limit: "このワールドは限界に近づいています。",
    accessDenied: {
        camera: "カメラへのアクセスが拒否されました。ここをクリックしてブラウザの権限を確認してください。",
        screenSharing: "画面共有が拒否されました。ここをクリックしてブラウザの権限を確認してください。",
        teleport: "このユーザーにテレポートする権限がありません。",
        room: "入室拒否。この部屋への入室が許可されていません。",
    },
    importantMessage: "重要なメッセージ",
    connectionLost: "通信切断。再接続しています…",
    connectionLostTitle: "通信切断",
    connectionLostSubtitle: "再接続",
    waitingConnectionTitle: "接続待機中",
    waitingConnectionSubtitle: "接続中",
    megaphoneNeeds: "メガホンを使用するには、カメラまたはマイクを起動するか、画面を共有する必要があります。",
    mapEditorShortCut: "マップエディタ―を開く際にエラーが発生しました。",
    mapEditorNotEnabled: "このワールドでは、マップエディターが有効になっていません。",
    popupBlocked: {
        title: "ポップアップがブロックされました",
        content: "ブラウザの設定でポップアップを許可してください。",
        done: "OK",
    },
};

export default warning;
