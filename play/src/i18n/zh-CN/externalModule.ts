import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "状态正常 ✅",
        offLine: "状态离线 ❌",
        warning: "状态警告 ⚠️",
        sync: "状态同步中 🔄",
    },
    teams: {
        openingMeeting: "正在打开 Teams 会议...",
        unableJoinMeeting: "无法加入 Teams 会议！",
        userNotConnected: "您未与 Outlook 或 Google 账户同步！",
        connectToYourTeams: "请连接到您的 Outlook 或 Google 账户 🙏",
        temasAppInfo:
            "Teams 是一款 Microsoft 365 应用程序，可帮助您的团队保持联系和组织有序。您可以在一个地方聊天、开会、通话和协作 😍",
        buttonSync: "同步 Teams 🚀",
        buttonConnect: "连接 Teams 🚀",
    },
    discord: {
        integration: "集成",
        explainText:
            "通过在此处连接您的 Discord 账户，您将能够在 WorkAdventure 聊天中直接接收消息。同步服务器后，我们将创建其中包含的房间，您只需在 WorkAdventure 聊天中加入它们即可。",
        login: "连接到 Discord",
        fetchingServer: "正在获取您的 Discord 服务器... 👀",
        qrCodeTitle: "使用您的 Discord 应用扫描二维码以登录。",
        qrCodeExplainText: "使用您的 Discord 应用扫描二维码以登录。二维码有时间限制，有时您需要重新生成一个",
        qrCodeRegenerate: "获取新的二维码",
        tokenInputLabel: "Discord 令牌",
        loginToken: "使用令牌登录",
        loginTokenExplainText: "您需要输入您的 Discord 令牌。要执行 Discord 集成，请参阅",
        sendDiscordToken: "发送",
        tokenNeeded: "您需要输入您的 Discord 令牌。要执行 Discord 集成，请参阅",
        howToGetTokenButton: "如何获取我的 Discord 登录令牌",
        loggedIn: "已连接为：",
        saveSync: "保存并同步",
        logout: "注销",
        back: "返回",
        tokenPlaceholder: "您的 Discord 令牌",
        loginWithQrCode: "使用二维码登录",
        guilds: "Discord 服务器",
        guildExplain: "选择要添加到 WorkAdventure 聊天界面的频道。\n",
    },
    outlook: {
        signIn: "使用 Outlook 登录",
        popupScopeToSync: "连接我的 Outlook 账户",
        popupScopeToSyncExplainText:
            "我们需要连接到您的 Outlook 账户以同步您的日历和/或任务。这将允许您在 WorkAdventure 中查看您的会议和任务，并直接从地图加入它们。",
        popupScopeToSyncCalendar: "同步我的日历",
        popupScopeToSyncTask: "同步我的任务",
        popupCancel: "取消",
        isSyncronized: "已与 Outlook 同步",
        popupScopeIsConnectedExplainText: "您已连接，请点击按钮注销并重新连接。",
        popupScopeIsConnectedButton: "注销",
        popupErrorTitle: "⚠️ Outlook 或 Teams 模块同步失败",
        popupErrorDescription: "Outlook 或 Teams 模块初始化同步失败。要连接，请尝试重新连接。",
        popupErrorContactAdmin: "如果问题仍然存在，请联系您的管理员。",
        popupErrorShowMore: "显示更多信息",
        popupErrorMoreInfo1: "登录过程可能有问题。请检查 SSO Azure 提供商是否正确配置。",
        popupErrorMoreInfo2:
            '请检查 SSO Azure 提供商的 "offline_access" 范围是否已启用。此范围是获取刷新令牌并保持 Teams 或 Outlook 模块连接所必需的。',
    },
    google: {
        signIn: "使用 Google 登录",
        popupScopeToSync: "连接我的 Google 账户",
        popupScopeToSyncExplainText:
            "我们需要连接到您的 Google 账户以同步您的日历和/或任务。这将允许您在 WorkAdventure 中查看您的会议和任务，并直接从地图加入它们。",
        popupScopeToSyncCalendar: "同步我的日历",
        popupScopeToSyncTask: "同步我的任务",
        popupCancel: "取消",
        isSyncronized: "已与 Google 同步",
        popupScopeToSyncMeet: "创建在线会议",
        openingMeet: "正在打开 Google Meet... 🙏",
        unableJoinMeet: "无法加入 Google Meet 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "正在创建您的 Google 空间…这只需要几秒钟 💪",
            guestError: "您未连接，因此无法创建 Google Meet 😭",
            guestExplain: "请登录平台以创建 Google Meet，或要求所有者为您创建一个 🚀",
            error: "您的 Google Workspace 设置不允许您创建 Meet。",
            errorExplain: "别担心，当其他人分享链接时，您仍然可以加入会议 🙏",
        },
        popupScopeIsConnectedButton: "注销",
        popupScopeIsConnectedExplainText: "您已连接，请点击按钮注销并重新连接。",
    },
    calendar: {
        title: "您今天的会议",
        joinMeeting: "点击此处加入会议",
    },
    todoList: {
        title: "待办事项",
        sentence: "休息一下 🙏 也许来杯咖啡或茶？ ☕",
    },
};

export default externalModule;
