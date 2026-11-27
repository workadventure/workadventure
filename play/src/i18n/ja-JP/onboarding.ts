import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "{worldName}へようこそ！ 🚀",
        description:
            "移動、チャット、リアルタイムでのコラボレーションが可能な仮想世界を探索する準備をしましょう。始めるための簡単なツアーをしましょう！",
    },
    movement: {
        title: "移動する",
        descriptionDesktop:
            "矢印キーまたはWASDでキャラクターを移動できます。右クリックでも移動できます。今すぐ移動してみてください！",
        descriptionTouch:
            "マップをタップするとその場所へ移動し、ドラッグすると周りを見渡せます。今すぐ移動してみてください！",
        next: "次へ",
    },
    communication: {
        title: "コミュニケーションバブル",
        description:
            "他のプレイヤーに近づくと、自動的にコミュニケーションバブルに入ります。同じバブル内の他のプレイヤーとチャットできます！",
    },
    lockBubble: {
        title: "会話をロックする",
        description:
            "ロックボタンをクリックして、他のプレイヤーが会話バブルに参加できないようにします。プライベートな議論に便利です！",
    },
    screenSharing: {
        title: "画面を共有する",
        description: "会話バブル内の他のプレイヤーと画面を共有します。プレゼンテーションやコラボレーションに最適です！",
    },
    pictureInPicture: {
        title: "ピクチャーインピクチャー",
        description:
            "ピクチャーインピクチャーモードを使用して、マップをナビゲートしながらビデオ通話を表示し続けます。マルチタスクに最適です！",
    },
    complete: {
        title: "準備完了です！ 🎉",
        description:
            "{worldName}の基本を学びました！自由に探索し、新しい人と出会い、楽しんでください。必要に応じて、メニューからいつでもヘルプにアクセスできます。",
    },
    tips: {
        label: "ヒント",
        next: "次へ",
        previous: "戻る",
        gotIt: "わかりました",
        close: "閉じる",
        stopShowing: "ヒントを表示しない",
        restartTutorial: "チュートリアルをやり直す",
        showMe: "見てみる",
        notNow: "後で",
    },
    help: {
        inConversation: "会話中に使えます",
        inMapEditor: "マップエディターで使えます",
        notHere: "ここでは今は使えません",
        remindMe: "リマインド",
        showTips: "ヒントを自動で表示",
        groups: {
            world: "このワールド",
            tutorial: "初回訪問",
            announcement: "新機能",
            conversation: "会話",
            chat: "チャット",
            presence: "ステータスと表現",
            mapEditor: "マップエディター",
            navigation: "人や場所を探す",
            worldAdmin: "ワールド管理ツール",
            app: "アプリと設定",
        },
        unseen: "新着 {count} 件",
    },
    releaseNotes: {
        title: "WorkAdventure {version} の新機能",
    },
    mapEditorTour: {
        title: "マップエディターで家具を配置する",
        openMenu: {
            title: "この場所を自分らしく",
            text: "このマップは編集できます。**{menu}** メニューを開いて始めましょう。",
        },
        openEditor: "**{editor}** をクリックしてください。",
        placeObject: {
            title: "家具を配置する",
            text: "このリストからオブジェクトを選び、マップをクリックして配置します。",
        },
    },
} satisfies Translation["onboarding"];
