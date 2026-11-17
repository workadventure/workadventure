import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "刷新",
    title: "您的录制列表",
    noRecordings: "未找到录制",
    errorFetchingRecordings: "获取录制时发生错误",
    expireIn: "{days}天{s}后过期",
    expiresOn: "于{date}过期",
    download: "下载",
    close: "关闭",
    recordingList: "录制",
    viewList: "列表视图",
    viewCards: "卡片视图",
    back: "返回",
    actions: "操作",
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
            title: "录制",
            source: "录制内容",
            savedHint: "停止后保存到你的录制列表。",
            megaphone: "录制扩音器",
            discussion: "录制讨论",
            withMap: "视频布局：",
            camerasOnly: "仅摄像头",
            camerasOnlyHint: "仅摄像头，不含地图。录制期间无法导播：没有导播面板，也不能更改布局或缩放。",
            layout: {
                map: "地图优先",
                balanced: "均衡",
                cameras: "摄像头优先",
            },
        },
        producer: {
            preview: "视频当前画面",
            layout: "布局",
            zoom: "缩放",
            zoomLevel: {
                tight: "近景",
                wide: "拉远",
                whole: "整张地图",
            },
            framing: "取景",
            follow: "跟随气泡",
            frameMyView: "按我看到的取景",
            cameras: "摄像头",
            pin: "固定",
            unpin: "取消固定",
            pinHint: "被固定的人即使不说话也保留画面（最多 {max} 人）。",
        },
    },
};

export default recording;
