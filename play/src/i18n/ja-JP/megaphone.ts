import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        selectCamera: "カメラを選択 📹",
        selectMicrophone: "マイクを選択 🎙️",
        liveMessage: {
            startMegaphone: "メガホンを開始",
            goingToStream: "ストリーミング配信",
            yourMicrophone: "マイク",
            yourCamera: "カメラ",
            yourScreen: "画面",
            title: "ライブメッセージ",
            button: "ライブメッセージを開始",
            and: "と",
            toAll: "参加者全員に",
            confirm: "確認",
            cancel: "キャンセル",
            notice: `ライブメッセージまたはメガホンを使えば、カメラとマイクを使って、ルーム内またはワールドに参加しているすべての人にライブメッセージを送ることができます。

            このメッセージは、ビデオ通話やバブルディスカッションのように画面の下隅に表示されます。

            ライブメッセージの使用例 : 「みなさんこんにちは、会議を始めましょうか🎉？私のアバターに従って会議エリアに行き、ビデオアプリを開いてください🚀。」
            `,
            settings: "設定",
        },
        textMessage: {
            title: "テキストメッセージ",
            notice: `
            テキストメッセージは、ルーム内またはワールドに参加しているすべての人にメッセージを送ることができます。

            このメッセージは、サウンドとともにページの上部にポップアップとして表示されます。

            メッセージの例 : 「ルーム 3 での会議は 2 分後に始まります🎉。ルーム 3 に行き、ビデオアプリを開いてください🚀。」
            `,
            button: "テキストメッセージを送信",
            noAccess: "この機能は使用できません😱。管理者にご連絡ください🙏。",
        },
        audioMessage: {
            title: "音声メッセージ",
            notice: `
            音声メッセージは "MP3, OGG..." というタイプのメッセージで、ルーム内またはワールドに参加しているすべてのユーザーに送信されます。

            音声メッセージは、この通知を受信しているすべての人に送信されます。

            音声メッセージは、会議が数分後に始まることを知らせる音声案内に使うことができます。
            `,
            button: "音声メッセージを送信",
            noAccess: "この機能は使用できません😱。管理者にご連絡ください🙏。",
        },
    },
};

export default megaphone;
