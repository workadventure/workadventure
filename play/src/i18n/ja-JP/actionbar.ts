import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "了解しました！",
    edit: "編集",
    cancel: "キャンセル",
    close: "閉じる",
    login: "ログイン",
    map: "ツール",
    profil: "名前を編集",
    startScreenSharing: "画面共有を開始",
    stopScreenSharing: "画面共有を停止",
    screenSharingMode: "画面共有モード",
    calendar: "カレンダー",
    todoList: "タスクリスト",
    woka: "アバターをカスタマイズ",
    companion: "コンパニオンを追加",
    test: "設定をテスト",
    editCamMic: "カメラ / マイクを編集",
    allSettings: "すべての設定",
    globalMessage: "グローバルメッセージを送信",
    mapEditor: "マップエディター",
    mapEditorMobileLocked: "マップエディターはモバイルモードでロックされています",
    mapEditorLocked: "マップエディターはロックされています 🔐",
    app: "サードパーティアプリケーション",
    camera: {
        disabled: "カメラが無効になっています",
        activate: "カメラを有効にする",
        noDevices: "カメラデバイスが見つかりません",
        setBackground: "背景を設定",
        blurEffects: "ぼかし効果",
        disableBackgroundEffects: "背景効果を無効にする",
        close: "閉じる",
    },
    microphone: {
        disabled: "マイクが無効になっています",
        activate: "マイクを有効にする",
        noDevices: "マイクデバイスが見つかりません",
    },
    speaker: {
        disabled: "スピーカーが無効になっています",
        activate: "スピーカーを有効にする",
        noDevices: "スピーカーデバイスが見つかりません",
    },
    status: {
        ONLINE: "オンライン",
        AWAY: "不在",
        BACK_IN_A_MOMENT: "すぐ戻る",
        DO_NOT_DISTURB: "邪魔しないで",
        BUSY: "忙しい",
        OFFLINE: "オフライン",
        SILENT: "サイレント",
        JITSI: "会議中",
        BBB: "会議中",
        DENY_PROXIMITY_MEETING: "利用不可",
        SPEAKER: "会議中",
        LIVEKIT: "会議中",
        LISTENER: "会議中",
    },
    subtitle: {
        camera: "カメラ",
        microphone: "マイク",
        speaker: "オーディオ出力",
    },
    background: {
        settings: "設定",
        cameraBackground: "カメラの背景",
        noEffect: "効果なし",
        blur: "ぼかし",
        blurSmall: "小さなぼかし",
        blurMiddle: "中程度のぼかし",
        blurHigh: "強いぼかし",
        images: "画像",
        videos: "動画",
    },
    help: {
        chat: {
            title: "テキストメッセージを送信",
            desc: "アイデアを共有したり、直接書面でディスカッションを開始できます。シンプルで明確、効果的です。",
        },
        users: {
            title: "ユーザーリストを表示",
            desc: "誰がいるか確認し、名刺にアクセスし、メッセージを送信するか、ワンクリックで近づくことができます！",
        },
        emoji: {
            title: "絵文字を表示",
            desc: "絵文字のリアクションを使用して、ワンクリックで気持ちを表現できます。タップするだけです！",
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
        follow: {
            title: "フォローを依頼",
            desc: "ユーザーにフォローを依頼でき、このリクエストが承認されると、そのWokaが自動的にあなたをフォローし、シームレスな接続が確立されます。",
        },
        unfollow: {
            title: "フォローを停止",
            desc: "いつでもユーザーのフォローを停止することを選択できます。その後、Wokaはそれらをフォローしなくなり、移動の自由を取り戻します。",
        },
        lock: {
            title: "会話をロック",
            desc: "この機能を有効にすると、誰もディスカッションに参加できなくなります。あなたがスペースの主人であり、すでに存在する人だけが対話できます。",
        },
        megaphone: {
            title: "メガホンを停止",
            desc: "すべてのユーザーへのメッセージの放送を停止します。",
        },
        mic: {
            title: "マイクを有効/無効にする",
            desc: "ディスカッション中に他の人があなたを聞けるように、マイクを有効または無効にします。",
        },
        micDisabledByStatus: {
            title: "マイクが無効になっています",
            desc: 'ステータスが"{status}"のため、マイクが無効になっています。',
        },
        cam: {
            title: "カメラを有効/無効にする",
            desc: "他の参加者にビデオを表示するために、カメラを有効または無効にします。",
        },
        camDisabledByStatus: {
            title: "カメラが無効になっています",
            desc: 'ステータスが"{status}"のため、カメラが無効になっています。',
        },
        share: {
            title: "画面を共有",
            desc: "他のユーザーと画面を共有したいですか？できます！チャット内の全員に画面を表示でき、画面全体または特定のウィンドウのみを共有することを選択できます。",
        },
        apps: {
            title: "サードパーティアプリケーション",
            desc: "スムーズで豊かな体験のために、アプリケーション内にいながら外部アプリケーションを自由にナビゲートできます。",
        },
        roomList: {
            title: "ルームリスト",
            desc: "ルームのリストを閲覧して、誰がいるか確認し、ワンクリックで会話に参加できます。",
        },
        calendar: {
            title: "カレンダー",
            desc: "今後の会議を確認し、WorkAdventureから直接参加できます。",
        },
        todolist: {
            title: "タスクリスト",
            desc: "ワークスペースを離れることなく、その日のタスクを管理できます。",
        },
        pictureInPicture: {
            title: "ピクチャーインピクチャー",
            descDisabled:
                "申し訳ございませんが、この機能はお使いのデバイスでは利用できません ❌。この機能にアクセスするには、Chrome や Edge などの別のデバイスやブラウザをお試しください。",
            desc: "会話中にビデオやプレゼンテーションを視聴する際に、ピクチャーインピクチャー機能を使用できます。ピクチャーインピクチャーアイコンをクリックするだけで、コンテンツをお楽しみいただけます。",
        },
    },
    listStatusTitle: {
        enable: "ステータスを変更",
    },
    externalModule: {
        status: {
            onLine: "ステータスは正常です ✅",
            offLine: "ステータスはオフラインです ❌",
            warning: "ステータスは警告です ⚠️",
            sync: "ステータスは同期中です 🔄",
        },
    },
    featureNotAvailable: "このルームでは利用できない機能です 😭",
    issueReport: {
        menuAction: "問題を報告",
        formTitle: "問題を報告",
        emailLabel: "メール（任意）",
        nameLabel: "名前（任意）",
        descriptionLabel: "説明*（必須）",
        descriptionPlaceholder: "問題は何ですか？何を期待していましたか？",
        submitButtonLabel: "バグレポートを送信",
        cancelButtonLabel: "キャンセル",
        confirmButtonLabel: "確認",
        addScreenshotButtonLabel: "スクリーンショットを追加",
        removeScreenshotButtonLabel: "スクリーンショットを削除",
        successMessageText: "ご報告ありがとうございます！できるだけ早く確認いたします。",
        highlightToolText: "強調表示",
        hideToolText: "非表示",
        removeHighlightText: "削除",
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
