import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "歡迎來到 {worldName}！ 🚀",
        description: "準備好探索一個虛擬世界，在這裡你可以移動、與他人聊天並即時協作。讓我們快速瀏覽一下，幫助您開始！",
        start: "開始吧！",
        skip: "略過教學",
    },
    movement: {
        title: "移動",
        descriptionDesktop: "使用方向鍵或 WASD 移動您的角色。您也可以按滑鼠右鍵來移動。現在試試移動吧！",
        descriptionMobile: "使用搖桿或點選地圖來移動您的角色。現在試試移動吧！",
        next: "下一步",
    },
    communication: {
        title: "通訊氣泡",
        description: "當您靠近其他玩家時，會自動進入通訊氣泡。您可以在同一個氣泡中與其他玩家聊天！",
        video: "./static/Videos/Meet.mp4",
        next: "知道了！",
    },
    lockBubble: {
        title: "鎖定您的對話",
        description: "點選鎖定按鈕以防止其他人加入您的對話氣泡。這對私人討論很有用！",
        video: "./static/Videos/LockBubble.mp4",
        hint: "點選醒目顯示的鎖定按鈕試試看！",
        next: "下一步",
    },
    screenSharing: {
        title: "分享您的螢幕",
        description: "與對話氣泡中的其他人分享您的螢幕。非常適合簡報與協作！",
        video: "./static/images/screensharing.mp4",
        hint: "點選醒目顯示的螢幕分享按鈕開始分享！",
        next: "下一步",
    },
    pictureInPicture: {
        title: "子母畫面",
        description: "使用子母畫面模式，在瀏覽地圖時保持視訊通話可見。非常適合多工處理！",
        video: "./static/Videos/PictureInPicture.mp4",
        hint: "點選醒目顯示的 PiP 按鈕來啟用它！",
        next: "下一步",
    },
    complete: {
        title: "您已準備就緒！ 🎉",
        description:
            "您已經學會了 {worldName} 的基礎知識！隨時可以探索、結識新朋友並享受樂趣。如有需要，您隨時可以從選單存取說明。",
        finish: "開始探索！",
    },
} satisfies Translation["onboarding"];
