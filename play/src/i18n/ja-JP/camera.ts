import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "カメラを編集",
    editMic: "マイクを編集",
    editSpeaker: "オーディオ出力を編集",
    active: "アクティブ",
    disabled: "無効",
    notRecommended: "推奨されません",
    enable: {
        title: "カメラとマイクを有効にしてください",
        start: "オーディオおよびビデオデバイスの設定ページへようこそ！オンライン体験を向上させるためのツールをここで見つけることができます。潜在的な問題を解決するために、設定を好みに合わせて調整してください。ハードウェアが正しく接続され、最新の状態であることを確認してください。最適な構成を見つけるために、さまざまな構成を探索してテストしてください。",
    },
    help: {
        title: "カメラとマイクへのアクセスが必要です",
        permissionDenied: "拒否されました。",
        content: "ブラウザからカメラとマイクへのアクセスを許可する必要があります。",
        firefoxContent:
            "今後 Firefox からの問い合わせを受けたくない場合は「今後も同様に処理する」にチェックを付けてください。",
        allow: "ウェブカメラを許可",
        continue: "カメラなしで続ける",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
    },
    webrtc: {
        title: "ビデオ中継サーバー接続エラー",
        titlePending: "ビデオ中継サーバー接続保留",
        error: "TURN サーバーにアクセスできません",
        content: "ビデオ中継サーバーにアクセスできません。他のユーザーと通信できない可能性があります。",
        solutionVpn: "<strong>VPN 経由で接続している</strong>場合は、VPN を切断してページを更新してください。",
        solutionVpnNotAskAgain: "わかりました。もう警告しないでください 🫡",
        solutionHotspot:
            "企業ネットワークなど制限されたネットワークを使用している場合は、ネットワークを切り替えてみてください。例えば、携帯電話で Wi-Fi ホットスポットを作成して、携帯電話経由で接続してください。",
        solutionNetworkAdmin:
            "あなたが<strong>ネットワーク管理者</strong>であれば、「ネットワーク準備」ガイドを確認してください。",
        preparingYouNetworkGuide: '"ネットワーク準備"ガイド',
        refresh: "更新",
        continue: "続ける",
        newDeviceDetected: "新しいデバイスが検出されました {device} 🎉 切り替えますか？ [スペース]",
    },
    my: {
        silentZone: "サイレントゾーン",
        silentZoneDesc:
            "あなたはサイレントゾーンにいます。一緒にいる人だけを見たり聞いたりできます。部屋の他の人を見たり聞いたりすることはできません。",
        nameTag: "あなた",
        loading: "カメラを読み込んでいます...",
    },
    disable: "カメラをオフにする",
    menu: {
        moreAction: "その他のアクション",
        closeMenu: "メニューを閉じる",
        senPrivateMessage: "プライベートメッセージを送る (近日公開)",
        kickoffUser: "ユーザーを蹴とばす",
        muteAudioUser: "音声をミュート",
        askToMuteAudioUser: "音声をミュートするよう依頼",
        muteAudioEveryBody: "全員の音声をミュート",
        muteVideoUser: "ビデオをミュート",
        askToMuteVideoUser: "ビデオをミュートするよう依頼",
        muteVideoEveryBody: "全員のビデオをミュート",
        blockOrReportUser: "ユーザーをブロックまたは報告",
    },
    backgroundEffects: {
        imageTitle: "背景画像",
        videoTitle: "背景動画",
        blurTitle: "背景ぼかし",
        resetTitle: "背景効果を無効化",
        title: "背景効果",
        close: "閉じる",
        blurAmount: "ぼかしの量",
    },
};

export default camera;
