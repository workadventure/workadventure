import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "更新",
    title: "録画リスト",
    noRecordings: "録画が見つかりません",
    errorFetchingRecordings: "録画の取得中にエラーが発生しました",
    expireIn: "{days}日{s}で期限切れ",
    expiresOn: "{date}に期限切れ",
    download: "ダウンロード",
    close: "閉じる",
    recordingList: "録画",
    viewList: "リスト表示",
    viewCards: "カード表示",
    back: "戻る",
    actions: "操作",
    contextMenu: {
        openInNewTab: "新しいタブで開く",
        delete: "削除",
    },
    notification: {
        deleteNotification: "録画が正常に削除されました",
        deleteFailedNotification: "録画の削除に失敗しました",
        startFailedNotification: "録画の開始に失敗しました",
        stopFailedNotification: "録画の停止に失敗しました",
        recordingStarted: "{name}が録画を開始しました。",
        downloadFailedNotification: "録画のダウンロードに失敗しました",
        recordingComplete: "録画が完了しました",
        recordingIsInProgress: "録画が進行中です",
        unexpectedlyStoppedNotification: "録画が予期せず停止しました",
        recordingSaved: "録画が正常に保存されました。",
        howToAccess: "録画にアクセスするには:",
        viewRecordings: "録画を表示",
    },
    actionbar: {
        title: {
            start: "録画を開始",
            stop: "録画を停止",
            inProgress: "録画が進行中です",
        },
        desc: {
            needLogin: "録画するにはログインする必要があります。",
            advert: "すべての参加者に、録画を開始することを通知します。",
            yourRecordInProgress: "録画が進行中です。クリックして停止します。",
            inProgress: "録画が進行中です",
        },
        spacePicker: {
            title: "録画",
            source: "録画する対象",
            savedHint: "停止すると録画一覧に保存されます。",
            megaphone: "メガホンを録音する",
            discussion: "ディスカッションを録音する",
            withMap: "動画のレイアウト：",
            camerasOnly: "カメラのみ",
            camerasOnlyHint:
                "マップなしでカメラのみを録画します。録画中は演出できません（プロデューサーパネル、レイアウトやズームの変更はありません）。",
            layout: {
                map: "マップ優先",
                balanced: "バランス",
                cameras: "カメラ優先",
            },
        },
        producer: {
            preview: "現在の動画",
            layout: "レイアウト",
            zoom: "ズーム",
            zoomLevel: {
                tight: "寄り",
                wide: "引き",
                whole: "マップ全体",
            },
            framing: "フレーミング",
            follow: "バブルを追う",
            frameMyView: "自分の見ている範囲を映す",
            cameras: "カメラ",
            pin: "固定",
            unpin: "固定解除",
            pinHint: "固定した人は話していなくてもタイルが残ります（最大 {max} 人）。",
        },
    },
};

export default recording;
