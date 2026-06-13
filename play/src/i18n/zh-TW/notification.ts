import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} 想與您討論",
    message: "{name} 傳送了一則訊息",
    chatRoom: "在聊天室中",
    askToMuteMicrophone: "我可以將您的麥克風靜音嗎？",
    askToMuteCamera: "我可以將您的攝影機靜音嗎？",
    microphoneMuted: "您的麥克風已被管理員靜音",
    cameraMuted: "您的攝影機已被管理員靜音",
    notificationSentToMuteMicrophone: "已向 {name} 傳送通知以靜音其麥克風",
    notificationSentToMuteCamera: "已向 {name} 傳送通知以靜音其攝影機",
    announcement: "公告",
    open: "開啟",
    help: {
        title: "通知存取被拒絕",
        permissionDenied: "權限被拒絕",
        content: "不要錯過任何討論。啟用通知，以便在有人想與您交談時收到通知，即使您不在 WorkAdventure 分頁上。",
        firefoxContent: "如果您不希望 Firefox 繼續要求授權，請勾選「記住此決定」核取方塊。",
        refresh: "重新整理",
        continue: "不使用通知繼續",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: "新增標籤：「{tag}」",
    screenSharingError: "無法開始螢幕分享",
    recordingStarted: "討論中的一個人已開始錄製。",
    urlCopiedToClipboard: "URL 已複製到剪貼簿",
};

export default notification;
