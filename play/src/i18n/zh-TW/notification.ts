import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} 想與您討論",
    message: "{name} 傳送了一則訊息",
    mention: "{name} 提及了你",
    askToMuteMicrophone: "我可以將您的麥克風靜音嗎？",
    askToMuteCamera: "我可以將您的攝影機靜音嗎？",
    microphoneMuted: "您的麥克風已被管理員靜音",
    cameraMuted: "您的攝影機已被管理員靜音",
    givenTheFloor: "輪到你發言了",
    givenTheFloorEnableMicrophone: "輪到你發言了 — 請開啟麥克風",
    floorRevoked: "你不再擁有發言權",
    floorGivenBack: "你已交回發言權",
    handLowered: "主持人放下了你的手",
    removedFromConversation: "管理員已將你移出對話。",
    actionFailed: "無法完成此操作",
    announcement: "公告",
    a11y: {
        chatMessage: "{sender}：{excerpt}",
        directMessage: "來自 {sender} 的私訊：{excerpt}",
        mention: "{sender} 在 {room} 中提到了你：{excerpt}",
        roomMessage: "{room} 中的 {sender}：{excerpt}",
        bubbleLocked: "對話已鎖定：其他人無法加入",
        bubbleUnlocked: "對話已解鎖",
        handRaised: "{name} 舉手了",
        megaphone: "{name} 正在透過擴音器說話",
    },
    help: {
        title: "通知存取被拒絕",
        permissionDenied: "權限被拒絕",
        content: "不要錯過任何討論。啟用通知，以便在有人想與您交談時收到通知，即使您不在 WorkAdventure 分頁上。",
        firefoxContent: "如果您不希望 Firefox 繼續要求授權，請勾選「記住此決定」核取方塊。",
        refresh: "重新整理",
        continue: "不使用通知繼續",
        screen: {
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
        screenAlt: "在 Chrome 網址列中允許通知",
    },
    addNewTag: "新增標籤：「{tag}」",
    screenSharingError: "無法開始螢幕分享",
    recordingStarted: "討論中的一個人已開始錄製。",
    urlCopiedToClipboard: "URL 已複製到剪貼簿",
};

export default notification;
