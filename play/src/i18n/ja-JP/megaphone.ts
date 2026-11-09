import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "お知らせを送信",
        audience: "誰に送りますか？",
        thisRoom: "このルーム",
        wholeWorld: "ワールド全体",
        place: "移動先（任意）",
        noPlace: "場所なし",
        noPlaceOnMap: "このマップにはまだ名前付きエリアがありません。",
        preview: "プレビュー",
        sendToRoom: "このルームに送信",
        sendToWorld: "ワールド全体に送信",
        confirmWorld: "ワールドのすべてのルームに届きます。",
        confirmSend: "はい、ワールド全体に送信",
        cancel: "キャンセル",
        sentToRoom: "このルームにお知らせを送信しました",
        sentToWorld: "ワールド全体にお知らせを送信しました",
        join: "{place}へ移動",
        joinMap: "移動",
        placeNotFound: "この場所はマップ上にもう存在しません。",
        admin: "管理者",
        more: "待機中のお知らせ: {count}",
    },
    modal: {
        liveMessage: {
            microphoneOff: "マイクオフ",
            cameraOff: "カメラオフ",
            cameraOffHint: "マイクだけでもライブ配信できます。",
            devices: "カメラとマイク",
            whoHears: "誰に聞こえますか？",
            thisRoom: "このルーム",
            wholeWorld: "ワールドのすべてのルーム",
            live: "ライブ",
            stop: "停止",
            startMegaphone: "メガホンを開始",
            stopMegaphone: "メガホンを停止",
            goingToStream: "ストリーミング配信",
            yourMicrophone: "マイク",
            yourCamera: "カメラ",
            yourScreen: "画面",
            title: "ライブメッセージ",
            and: "と",
            toAll: "参加者全員に",
            settings: "設定",
        },
    },
};

export default megaphone;
