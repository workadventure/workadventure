import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "警告！",
    content: `該世界已接近容量上限！你可以 <a href="{upgradeLink}" target="_blank">點選這裡</a> 升級它的容量`,
    limit: "該世界已接近容量上限！",
    accessDenied: {
        camera: "攝影機存取權限被拒絕。點選這裡檢查你的瀏覽器權限。",
        screenSharing: "螢幕分享權限被拒絕。點選這裡檢查你的瀏覽器權限。",
        teleport: "您無權傳送至此使用者。",
        room: "房間存取被拒絕。你不能進入這個房間",
    },
    importantMessage: "重要訊息",
    connectionLost: "連線中斷。重新連線中...",
    connectionLostTitle: "連線中斷。",
    connectionLostSubtitle: "重新連線中",
    waitingConnectionTitle: "等待連線",
    waitingConnectionSubtitle: "連線中",
    megaphoneNeeds: "要使用擴音器，您必須啟用攝影機或麥克風，或分享螢幕。",
    mapEditorShortCut: "嘗試開啟地圖編輯器時發生錯誤。",
    mapEditorNotEnabled: "地圖編輯器在此世界中未啟用。",
    backgroundProcessing: {
        failedToApply: "套用背景效果失敗",
    },
    popupBlocked: {
        title: "彈出視窗被封鎖",
        content: "請在您的瀏覽器設定中允許此網站的彈出視窗。",
        done: "好的",
    },
    duplicateUserConnected: {
        title: "已連線",
        message: "該使用者已從其他分頁或裝置連線到此房間。為避免衝突，請關閉其他分頁或視窗。",
        confirmContinue: "知道了，繼續",
        dontRemindAgain: "不再顯示此訊息",
    },
    browserNotSupported: {
        title: "😢 不支援的瀏覽器",
        message: "您的瀏覽器（{browserName}）不再受 WorkAdventure 支援。",
        description: "您的瀏覽器太舊，無法執行 WorkAdventure。請更新至最新版本以繼續。",
        whatToDo: "您可以怎麼做？",
        option1: "將 {browserName} 更新至最新版本",
        option2: "退出 WorkAdventure 並使用其他瀏覽器",
        updateBrowser: "更新瀏覽器",
        leave: "離開",
    },
    pwaInstall: {
        title: "安裝 WorkAdventure",
        description: "安裝應用程式以獲得更好的體驗：快速存取、開機啟動以及更像原生應用程式的體驗。",
        descriptionIos: "將 WorkAdventure 加入主畫面，以獲得更好的體驗和快速存取。",
        feature1Title: "快速存取",
        feature1Description: "從開始選單、Dock 或桌面啟動 WorkAdventure。",
        feature2Title: "獨立應用程式視窗",
        feature2Description: "讓 WorkAdventure 與瀏覽器分頁分開，並可在工作列中一眼找到它。",
        feature3Title: "隨電腦啟動",
        feature3Description: "在裝置啟動時啟動 WorkAdventure。",
        iosStepsTitle: "如何安裝",
        iosStep1: "在 Safari 底部點選「分享」按鈕（帶箭頭的方框）。",
        iosStep2: "向下捲動並點選「加入主畫面」。",
        iosStep3: "點選「加入」以確認。",
        install: "安裝 WorkAdventure 應用程式",
        installing: "安裝中…",
        skip: "在瀏覽器中繼續",
        continue: "在瀏覽器中繼續",
        neverShowPage: "不再詢問",
    },
};

export default warning;
