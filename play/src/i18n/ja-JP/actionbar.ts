import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    //layout: "タイル表示の切り替え",
    //disableLayout: "ミーティング参加者が1人の場合は利用できません",
    //disableMegaphone: "メガホンの無効化",
    //menu: "メニューの表示／非表示",
    mapEditor: "マップエディターの表示／非表示",
    mapEditorMobileLocked: "マップエディタ―はモバイルモードではロックされています",
    mapEditorLocked: "マップエディターはロックされています 🔐",
    subtitle: {
        microphone: "マイク",
        speaker: "スピーカー",
    },
    app: "アプリケーションの表示／非表示",
    listStatusTitle: {
        enable: "ステータスの変更",
    },

    status: {
        ONLINE: "オンライン",
        BACK_IN_A_MOMENT: "すぐ戻る",
        DO_NOT_DISTURB: "邪魔しないで",
        BUSY: "忙しい",
    },
    globalMessage: "グローバルメッセージの送信",
    //roomList: "ルームリストの表示／非表示",
    //appList: "アプリリストの表示／非表示",
    help: {
        chat: {
            title: "チャットの表示／非表示",
        },
        follow: {
            title: "フォローする",
        },
        unfollow: {
            title: "フォローしない",
        },
        lock: {
            title: "会話のロック／アンロック",
        },
        share: {
            title: "画面共有の開始／停止",
        },
        mic: {
            title: "ミュート／ミュート解除",
        },
        cam: {
            title: "カメラの開始／停止",
        },
        emoji: {
            title: "絵文字の表示／非表示",
        },
        audioManager: {
            title: "環境音の音量",
            desc: "ここをクリックしてオーディオ音量を設定します。",
            pause: "ここをクリックしてオーディオを一時停止",
            play: "ここをクリックしてオーディオを再生",
            stop: "ここをクリックしてオーディオを停止",
        },
        audioManagerNotAllowed: {
            title: "環境音がブロックされました",
            desc: "ブラウザが環境音の再生をブロックしました。アイコンをクリックして再生を開始してください。",
        },
        pictureInPicture: {
            title: "ピクチャーインピクチャー",
            descDisabled:
                "申し訳ございませんが、この機能はお使いのデバイスでは利用できません ❌。この機能にアクセスするには、Chrome や Edge などの別のデバイスやブラウザをお試しください。",
            desc: "会話中にビデオやプレゼンテーションを視聴する際に、ピクチャーインピクチャー機能を使用できます。ピクチャーインピクチャーアイコンをクリックするだけで、コンテンツをお楽しみいただけます。",
        },
    },
    personalDesk: {
        label: "自分のデスクに移動",
        unclaim: "自分のデスクを解放",
        errorNoUser: "ユーザー情報が見つかりません",
        errorNotFound: "まだ個人デスクがありません",
        errorMoving: "個人デスクに到達できません",
        errorUnclaiming: "個人デスクを解放できません",
    },
};

export default actionbar;
