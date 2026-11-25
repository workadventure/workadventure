import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "歡迎來到 {worldName}！ 🚀",
        description: "準備好探索一個虛擬世界，在這裡你可以移動、與他人聊天並即時協作。讓我們快速瀏覽一下，幫助您開始！",
    },
    movement: {
        title: "移動",
        descriptionDesktop: "使用方向鍵或 WASD 移動您的角色。您也可以按滑鼠右鍵來移動。現在試試移動吧！",
        descriptionTouch: "點選地圖即可走到該處，拖曳可以環顧四周。現在試試移動吧！",
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
    },
    screenSharing: {
        title: "分享您的螢幕",
        description: "與對話氣泡中的其他人分享您的螢幕。非常適合簡報與協作！",
    },
    pictureInPicture: {
        title: "子母畫面",
        description: "使用子母畫面模式，在瀏覽地圖時保持視訊通話可見。非常適合多工處理！",
    },
    complete: {
        title: "您已準備就緒！ 🎉",
        description:
            "您已經學會了 {worldName} 的基礎知識！隨時可以探索、結識新朋友並享受樂趣。如有需要，您隨時可以從選單存取說明。",
    },
    tips: {
        label: "提示",
        next: "下一步",
        gotIt: "知道了",
        close: "關閉",
        stopShowing: "不再顯示提示",
        restartTutorial: "重新開始教學",
        showMe: "帶我看看",
        notNow: "以後再說",
    },
    announcements: {
        tours: {
            title: "提示與導覽",
            text: "WorkAdventure 現在會透過簡短的提示，一步步向你介紹各項功能。你可以在設定的 **{help}** 中重新查看它們和教學。",
        },
    },
    mapEditorTour: {
        title: "使用地圖編輯器擺放家具",
        openMenu: {
            title: "打造你的專屬空間",
            text: "你可以修改這張地圖。開啟 **{menu}** 選單開始吧。",
        },
        openEditor: "點擊 **{editor}**。",
        placeObject: {
            title: "擺放家具",
            text: "從清單中選擇一個物件，然後點擊地圖進行擺放。",
        },
    },
} satisfies Translation["onboarding"];
