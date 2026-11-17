import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "刷新",
    title: "您的录制列表",
    noRecordings: "未找到录制",
    errorFetchingRecordings: "获取录制时发生错误",
    expireIn: "{days}天{s}后过期",
    download: "下载",
    close: "关闭",
    recordingList: "录制",
    viewList: "列表视图",
    viewCards: "卡片视图",
    noRecordingsHint: "你开始的录制完成后会显示在这里。",
    play: "播放 {date} 的录制",
    deleteConfirm: {
        title: "删除此录制？",
        titleWithDate: "删除 {date} 的录制？",
        irreversible: "此操作无法撤销。",
        cancel: "取消",
    },
    contextMenu: {
        openInNewTab: "在新标签页中打开",
        delete: "删除",
    },
    notification: {
        deleteNotification: "录制已成功删除",
        deleteFailedNotification: "删除录制失败",
        startFailedNotification: "开始录制失败",
        stopFailedNotification: "停止录制失败",
        recordingStarted: "{name}已开始录制。",
        downloadFailedNotification: "下载录制失败",
        recordingComplete: "录制已完成",
        recordingIsInProgress: "录制正在进行中",
        unexpectedlyStoppedNotification: "录制意外停止了",
        recordingSaved: "您的录制已成功保存。",
        howToAccess: "要访问您的录制:",
        viewRecordings: "查看录制",
    },
    actionbar: {
        title: {
            start: "开始录制",
            stop: "停止录制",
            inProgress: "录制正在进行中",
        },
        desc: {
            needLogin: "您需要登录才能录制。",
            advert: "所有参与者将收到您正在开始录制的通知。",
            yourRecordInProgress: "录制正在进行中，点击停止。",
            inProgress: "录制正在进行中",
        },
        spacePicker: {
            megaphone: "录制扩音器",
            discussion: "录制讨论",
        },
    },
};

export default recording;
