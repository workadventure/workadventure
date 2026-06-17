import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "狀態正常 ✅",
        offLine: "狀態離線 ❌",
        warning: "狀態警告 ⚠️",
        sync: "狀態同步中 🔄",
    },
    teams: {
        openingMeeting: "正在開啟 Teams 會議...",
        unableJoinMeeting: "無法加入 Teams 會議！",
        userNotConnected: "您未與 Outlook 或 Google 帳戶同步！",
        connectToYourTeams: "請連線到您的 Outlook 或 Google 帳戶 🙏",
        temasAppInfo:
            "Teams 是一款 Microsoft 365 應用程式，可協助您的團隊保持聯繫並井然有序。您可以在一個地方聊天、開會、通話和協作 😍",
        buttonSync: "同步 Teams 🚀",
        buttonConnect: "連線 Teams 🚀",
    },
    discord: {
        integration: "整合",
        explainText:
            "在此處連線您的 Discord 帳戶後，您將能夠在 WorkAdventure 聊天中直接接收訊息。同步伺服器後，我們會建立其中包含的房間，您只需在 WorkAdventure 聊天中加入它們即可。",
        login: "連線到 Discord",
        fetchingServer: "正在取得您的 Discord 伺服器... 👀",
        qrCodeTitle: "使用您的 Discord 應用程式掃描 QR Code 以登入。",
        qrCodeExplainText: "使用您的 Discord 應用程式掃描 QR Code 以登入。QR Code 有時間限制，有時您需要重新產生一個",
        qrCodeRegenerate: "取得新的 QR Code",
        tokenInputLabel: "Discord 權杖",
        loginToken: "使用權杖登入",
        loginTokenExplainText: "您需要輸入您的 Discord 權杖。要執行 Discord 整合，請參閱",
        sendDiscordToken: "傳送",
        tokenNeeded: "您需要輸入您的 Discord 權杖。要執行 Discord 整合，請參閱",
        howToGetTokenButton: "如何取得我的 Discord 登入權杖",
        loggedIn: "已連線為：",
        saveSync: "儲存並同步",
        logout: "登出",
        back: "返回",
        tokenPlaceholder: "您的 Discord 權杖",
        loginWithQrCode: "使用 QR Code 登入",
        guilds: "Discord 伺服器",
        guildExplain: "選擇要加入 WorkAdventure 聊天介面的頻道。\n",
    },
    outlook: {
        signIn: "使用 Outlook 登入",
        popupScopeToSync: "連線我的 Outlook 帳戶",
        popupScopeToSyncExplainText:
            "我們需要連線到您的 Outlook 帳戶以同步您的行事曆和／或工作。這將讓您在 WorkAdventure 中查看您的會議和工作，並直接從地圖加入它們。",
        popupScopeToSyncCalendar: "同步我的行事曆",
        popupScopeToSyncTask: "同步我的工作",
        popupCancel: "取消",
        isSyncronized: "已與 Outlook 同步",
        popupScopeIsConnectedExplainText: "您已連線，請點選按鈕登出並重新連線。",
        popupScopeIsConnectedButton: "登出",
        popupErrorTitle: "⚠️ Outlook 或 Teams 模組同步失敗",
        popupErrorDescription: "Outlook 或 Teams 模組初始化同步失敗。要連線，請嘗試重新連線。",
        popupErrorContactAdmin: "如果問題仍然存在，請聯絡您的管理員。",
        popupErrorShowMore: "顯示更多資訊",
        popupErrorMoreInfo1: "登入過程可能有問題。請檢查 SSO Azure 提供者是否正確設定。",
        popupErrorMoreInfo2:
            "請檢查 SSO Azure 提供者的「offline_access」範圍是否已啟用。此範圍是取得重新整理權杖並保持 Teams 或 Outlook 模組連線所必需的。",
    },
    google: {
        signIn: "使用 Google 登入",
        popupScopeToSync: "連線我的 Google 帳戶",
        popupScopeToSyncExplainText:
            "我們需要連線到您的 Google 帳戶以同步您的行事曆和／或工作。這將讓您在 WorkAdventure 中查看您的會議和工作，並直接從地圖加入它們。",
        popupScopeToSyncCalendar: "同步我的行事曆",
        popupScopeToSyncTask: "同步我的工作",
        popupCancel: "取消",
        isSyncronized: "已與 Google 同步",
        popupScopeToSyncMeet: "建立線上會議",
        openingMeet: "正在開啟 Google Meet... 🙏",
        unableJoinMeet: "無法加入 Google Meet 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "正在建立您的 Google 空間…這只需要幾秒鐘 💪",
            guestError: "您未連線，因此無法建立 Google Meet 😭",
            guestExplain: "請登入平台以建立 Google Meet，或請擁有者為您建立一個 🚀",
            error: "您的 Google Workspace 設定不允許您建立 Meet。",
            errorExplain: "別擔心，當其他人分享連結時，您仍然可以加入會議 🙏",
        },
        popupScopeIsConnectedButton: "登出",
        popupScopeIsConnectedExplainText: "您已連線，請點選按鈕登出並重新連線。",
    },
    calendar: {
        title: "您今天的會議",
        joinMeeting: "點選此處加入會議",
    },
    todoList: {
        title: "待辦事項",
        sentence: "休息一下 🙏 也許來杯咖啡或茶？ ☕",
    },
};

export default externalModule;
