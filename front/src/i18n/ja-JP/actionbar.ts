import { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    //layout: "タイル表示の切り替え",
    //disableLayout: "ミーティング参加者が1人の場合は利用できません",
    //disableMegaphone: "メガホンの無効化",
    //menu: "メニューの表示／非表示",
    mapEditor: "マップエディターの表示／非表示",
    mapEditorMobileLocked: "マップエディタ―はモバイルモードではロックされています",
    mapEditorLocked: "マップエディターはロックされています 🔐",
    bo: "バックオフィスの表示",
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
    },
};

export default actionbar;
