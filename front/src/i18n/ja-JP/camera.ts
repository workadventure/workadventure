import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "カメラとマイクを有効にしてください",
        start: "開始",
    },
    help: {
        title: "カメラとマイクへのアクセスが必要です",
        permissionDenied: "拒否されました。",
        content: "ブラウザからカメラとマイクへのアクセスを許可する必要があります。",
        firefoxContent:
            "今後 Firefox からの問い合わせを受けたくない場合は「今後も同様に処理する」にチェックを付けてください。",
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
        preparingYouNetworkGuide: "",
        refresh: "更新",
        continue: "続ける",
    },
    my: {
        silentZone: "サイレントゾーン",
        nameTag: "あなた",
    },
    disable: "カメラをオフにする",
    menu: {
        moreAction: "その他のアクション",
        closeMenu: "メニューを閉じる",
        senPrivateMessage: "プライベートメッセージを送る (近日公開)",
        kickoffUser: "ユーザーを蹴とばす",
        muteAudioUser: "音声をミュート",
        muteAudioEveryBody: "全員の音声をミュート",
        muteVideoUser: "ビデオをミュート",
        muteVideoEveryBody: "全員のビデオをミュート",
        pin: "ピン留め",
        blockOrReportUser: "ユーザーをブロックまたは報告",
    },
};

export default camera;
