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
    ok: "确定",
    recordingList: "录制",
    contextMenu: {
        openInNewTab: "在新标签页中打开",
        delete: "删除",
    },
    notification: {
        deleteNotification: "录制已成功删除",
        deleteFailedNotification: "删除录制失败",
        recordingStarted: "讨论中的一个人已开始录制。",
        downloadFailedNotification: "下载录制失败",
        recordingComplete: "录制已完成",
    },
    actionbar: {
        title: {
            start: "开始录制",
            stop: "停止录制",
            inpProgress: "录制正在进行中",
        },
        desc: {
            needLogin: "您需要登录才能录制。",
            needPremium: "您需要是高级会员才能录制。",
            advert: "所有参与者将收到您正在开始录制的通知。",
            yourRecordInProgress: "录制正在进行中，点击停止。",
            inProgress: "录制正在进行中",
            notEnabled: "此世界已禁用录制。",
        },
    },
};

export default recording;
