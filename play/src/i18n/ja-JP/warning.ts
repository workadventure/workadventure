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
    backgroundProcessing: {
        failedToApply: "背景効果の適用に失敗しました",
    },
    livekitConnection: {
        critical: "他のユーザーとの通信に問題が発生する可能性があります。",
        warning: "オーディオまたはビデオの品質が低下する可能性があります。",
    },
    browserNotSupported: {
        title: "😢 サポートされていないブラウザ",
        message: "お使いのブラウザ（{browserName}）は、WorkAdventureでサポートされなくなりました。",
        description:
            "お使いのブラウザはWorkAdventureを実行するには古すぎます。続行するには、最新バージョンに更新してください。",
        whatToDo: "何ができますか？",
        option1: "{browserName}を最新バージョンに更新する",
        option2: "WorkAdventureを終了して別のブラウザを使用する",
        updateBrowser: "ブラウザを更新",
        leave: "終了",
    },
    pwaInstall: {
        title: "WorkAdventureをインストール",
        description:
            "アプリをインストールして、より快適に：読み込みが速く、すばやくアクセスでき、アプリのような体験ができます。",
        descriptionIos: "ホーム画面にWorkAdventureを追加して、より快適に素早くアクセスできます。",
        iosStepsTitle: "インストール方法",
        iosStep1: "Safariの下部にある「共有」ボタン（四角と矢印）をタップします。",
        iosStep2: "下にスクロールして「ホーム画面に追加」をタップします。",
        iosStep3: "「追加」をタップして確認します。",
        install: "WorkAdventure ウェブアプリをインストール",
        installing: "インストール中…",
        skip: "ブラウザで続ける",
        continue: "ブラウザで続ける",
        neverShowPage: "このページを今後表示しない",
    },
};

export default warning;
