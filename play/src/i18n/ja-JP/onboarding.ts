import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "WorkAdventureへようこそ！ 🚀",
        description:
            "移動、チャット、リアルタイムでのコラボレーションが可能な仮想世界を探索する準備をしましょう。始めるための簡単なツアーをしましょう！",
        start: "始めましょう！",
        skip: "チュートリアルをスキップ",
    },
    movement: {
        title: "移動する",
        description:
            "キーボードの矢印キーまたはWASDを使用して、マップ上でキャラクターを移動させます。今すぐ移動してみてください！",
        next: "次へ",
    },
    communication: {
        title: "コミュニケーションバブル",
        description:
            "他のプレイヤーに近づくと、自動的にコミュニケーションバブルに入ります。同じバブル内の他のプレイヤーとチャットできます！",
        video: "./static/Videos/Meet.mp4",
        next: "了解しました！",
    },
    lockBubble: {
        title: "会話をロックする",
        description:
            "ロックボタンをクリックして、他のプレイヤーが会話バブルに参加できないようにします。プライベートな議論に便利です！",
        video: "./static/Videos/LockBubble.mp4",
        hint: "ハイライトされたロックボタンをクリックして試してみてください！",
        next: "次へ",
    },
    screenSharing: {
        title: "画面を共有する",
        description:
            "会話バブル内の他のプレイヤーと画面を共有します。プレゼンテーションやコラボレーションに最適です！",
        video: "./static/images/screensharing.mp4",
        hint: "ハイライトされた画面共有ボタンをクリックして共有を開始してください！",
        next: "次へ",
    },
    pictureInPicture: {
        title: "ピクチャーインピクチャー",
        description:
            "ピクチャーインピクチャーモードを使用して、マップをナビゲートしながらビデオ通話を表示し続けます。マルチタスクに最適です！",
        video: "./static/Videos/PictureInPicture.mp4",
        hint: "ハイライトされたPiPボタンをクリックして有効にしてください！",
        next: "次へ",
    },
    complete: {
        title: "準備完了です！ 🎉",
        description:
            "WorkAdventureの基本を学びました！自由に探索し、新しい人と出会い、楽しんでください。必要に応じて、メニューからいつでもヘルプにアクセスできます。",
        finish: "探索を始めましょう！",
    },
} satisfies Translation["onboarding"];
