import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} 想与您讨论",
    message: "{name} 发送了一条消息",
    askToMuteMicrophone: "我可以将您的麦克风静音吗？",
    askToMuteCamera: "我可以将您的摄像头静音吗？",
    microphoneMuted: "您的麦克风已被管理员静音",
    cameraMuted: "您的摄像头已被管理员静音",
    givenTheFloor: "轮到你发言了",
    givenTheFloorEnableMicrophone: "轮到你发言了 — 请打开麦克风",
    floorRevoked: "你不再拥有发言权",
    floorGivenBack: "你已交回发言权",
    handLowered: "主持人放下了你的手",
    removedFromConversation: "管理员已将你移出对话。",
    actionFailed: "无法完成此操作",
    announcement: "公告",
    help: {
        title: "通知访问被拒绝",
        permissionDenied: "权限被拒绝",
        content: "不要错过任何讨论。启用通知以在有人想与您交谈时收到通知，即使您不在 WorkAdventure 标签页上。",
        firefoxContent: '如果您不希望 Firefox 继续请求授权，请点击"记住此决定"复选框。',
        refresh: "刷新",
        continue: "继续而不使用通知",
        screen: {
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
        screenAlt: "在 Chrome 地址栏中允许通知",
    },
    addNewTag: '添加新标签: "{tag}"',
    screenSharingError: "无法开始屏幕共享",
    recordingStarted: "讨论中的一个人已开始录制。",
    urlCopiedToClipboard: "URL 已复制到剪贴板",
};

export default notification;
