import { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    chat: "チャットの表示／非表示",
    follow: "フォローする",
    unfollow: "フォローしない",
    lock: "会話のロック／アンロック",
    screensharing: "画面共有の開始／停止",
    layout: "タイル表示の切り替え",
    disableLayout: "ミーティング参加者が1人の場合は利用できません",
    camera: "カメラの開始／停止",
    microphone: "ミュート／ミュート解除",
    emoji: "絵文字の表示／非表示",
    disableMegaphone: "メガホンの無効化",
    menu: "メニューの表示／非表示",
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
        inMeeting: "よいミーティングを 🤓",
        inSilentZone: "サイレントゾーンを楽しんで 😁",
    },

    status: {
        ONLINE: "オンライン",
        BACK_IN_A_MOMENT: "すぐ戻る",
        DO_NOT_DISTURB: "邪魔しないで",
        BUSY: "忙しい",
    },
    globalMessage: "グローバルメッセージの送信",
    roomList: "ルームリストの表示／非表示",
    appList: "アプリリストの表示／非表示",
};

export default actionbar;
