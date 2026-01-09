import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} 想与您讨论",
    message: "{name} 发送了一条消息",
    chatRoom: "在聊天室中",
    askToMuteMicrophone: "我可以将您的麦克风静音吗？",
    askToMuteCamera: "我可以将您的摄像头静音吗？",
    microphoneMuted: "您的麦克风已被管理员静音",
    cameraMuted: "您的摄像头已被管理员静音",
    notificationSentToMuteMicrophone: "已向 {name} 发送通知以静音其麦克风",
    notificationSentToMuteCamera: "已向 {name} 发送通知以静音其摄像头",
    announcement: "公告",
    open: "打开",
    help: {
        title: "通知访问被拒绝",
        permissionDenied: "权限被拒绝",
        content: "不要错过任何讨论。启用通知以在有人想与您交谈时收到通知，即使您不在 WorkAdventure 标签页上。",
        firefoxContent: '如果您不希望 Firefox 继续请求授权，请点击"记住此决定"复选框。',
        refresh: "刷新",
        continue: "继续而不使用通知",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: '添加新标签: "{tag}"',
    screenSharingError: "无法开始屏幕共享",
    urlCopiedToClipboard: "URL 已复制到剪贴板",
};

export default notification;
