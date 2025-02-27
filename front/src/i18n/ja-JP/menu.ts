import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "メニュー",
    icon: {
        open: {
            menu: "メニューを開く",
            invite: "招待状を見る",
            register: "登録する",
            chat: "チャットを開く",
            userlist: "ユーザーリスト",
            openEmoji: "絵文字選択画面を開く",
            closeEmoji: "絵文字メニューを閉じる",
            mobile: "モバイルメニューを開く",
        },
    },
    visitCard: {
        close: "閉じる",
        sendMessage: "メッセージの送信",
    },
    profile: {
        login: "ログイン",
        logout: "ログアウト",
    },
    settings: {
        videoBandwidth: {
            title: "ビデオの品質",
            low: "低品質",
            recommended: "推奨",
            unlimited: "無制限",
        },
        shareScreenBandwidth: {
            title: "画面共有の品質",
            low: "低品質",
            recommended: "推奨",
            unlimited: "無制限",
        },
        language: {
            title: "言語",
        },
        privacySettings: {
            title: "離席モード",
            explanation:
                "ブラウザの WorkAdventure タブが表示されていない間、WorkAdventure は離席モードに切り替わります。",
            cameraToggle: "離席モードでカメラをアクティブに保つ",
            microphoneToggle: "離席モードでマイクをアクティブに保つ",
        },
        save: "保存",
        otherSettings: "その他の設定",
        fullscreen: "全画面表示",
        notifications: "通知",
        chatSounds: "チャットサウンド",
        cowebsiteTrigger: "ウェブサイトや Jitsi ルームを開く前に必ず確認する",
        ignoreFollowRequest: "他のユーザをフォローするリクエストを無視する",
        proximityDiscussionVolume: "近接ディスカッションの音量",
        blockAudio: "環境音と音楽をブロックする",
        disableAnimations: "マップタイルのアニメーションを無効にする",
    },
    invite: {
        description: "ルームのリンクを共有します",
        copy: "コピー",
        share: "共有",
        walkAutomaticallyToPosition: "自分の位置まで自動的に歩きます",
        selectEntryPoint: "エントリポイントを選択します",
    },
    globalMessage: {
        text: "テキスト",
        audio: "オーディオ",
        warning: "ワールドのすべてのルームに送信",
        enter: "メッセージを入力してください",
        send: "送信",
    },
    globalAudio: {
        uploadInfo: "ファイルをアップロードします",
        error: "ファイルが選択されていません。送信する前にファイルをアップロードする必要があります。",
        errorUpload:
            "ファイルのアップロードエラーです。ファイルを確認して、もう一度やり直してください。問題が解決しない場合は、管理者に連絡してください。",
        dragAndDrop: "ファイルをアップロードするには、ドラッグアンドドロップするか、ここをクリックしてください 🎧",
    },
    contact: {
        gettingStarted: {
            title: "入門",
            description:
                "WorkAdventure を使用すると、他のユーザと自然にコミュニケーションできるオンラインスペースを作成することができます",
        },
        createMap: {
            title: "マップを作成します",
            description: "ドキュメントの手順に従って、独自のカスタムマップを作成することもできます",
        },
    },
    about: {
        mapInfo: "マップ情報",
        mapLink: "このマップへのリンク",
        copyrights: {
            map: {
                title: "マップの著作権",
                empty: "マップの作成者はマップの著作権を宣言していません。",
            },
            tileset: {
                title: "タイルセットの著作権",
                empty: "マップの作成者はタイルセットの著作権を宣言していません。これは、タイルセットに著作権がないというわけではありません。",
            },
            audio: {
                title: "オーディオファイルの著作権",
                empty: "マップの作成者はオーディオファイルの著作権を宣言していません。これは、オーディオファイルに著作権がないというわけではありません。",
            },
        },
    },
    sub: {
        profile: "プロファイル",
        settings: "設定",
        invite: "招待",
        credit: "クレジット",
        globalMessages: "グローバルメッセージ",
        contact: "コンタクト",
        report: "問題の報告",
    },
};

export default menu;
