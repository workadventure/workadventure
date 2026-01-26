import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} と話し合いたい",
    message: "{name} からメッセージを送信",
    chatRoom: "チャットルームで",
    askToMuteMicrophone: "マイクのミュートを依頼します 🙏",
    askToMuteCamera: "カメラのミュートを依頼します 🙏",
    microphoneMuted: "マイクがモデレーターによってミュートされました",
    cameraMuted: "カメラがモデレーターによってミュートされました",
    notificationSentToMuteMicrophone: "{name} にマイクをミュートする通知が送信されました",
    notificationSentToMuteCamera: "{name} にカメラをミュートする通知が送信されました",
    announcement: "お知らせ",
    open: "開く",
    help: {
        title: "通知へのアクセス拒否",
        permissionDenied: "拒否されました",
        content:
            "会話を見逃さない。WorkAdventure タブを開いていなくても、誰かがあなたと話したがっていることを通知できるように、通知を有効にしてください。",
        firefoxContent:
            "Firefox が継続的に許可を求めないようにするには、「この決定を記憶する」チェックボックスをクリックしてください。",
        refresh: "更新",
        continue: "通知なしで続行",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: '新しいタグを追加する : "{tag}"',
    screenSharingError: "画面共有を開始できません",
    recordingStarted: "ディスカッション内の1人が録画を開始しました。",
    urlCopiedToClipboard: "URL がクリップボードにコピーされました",
};

export default notification;
