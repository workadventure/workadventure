import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "重新整理",
    title: "您的錄製清單",
    noRecordings: "找不到錄製",
    errorFetchingRecordings: "取得錄製時發生錯誤",
    expireIn: "{days}天{s}後到期",
    expiresOn: "於{date}到期",
    download: "下載",
    close: "關閉",
    recordingList: "錄製",
    viewList: "清單檢視",
    viewCards: "卡片檢視",
    back: "返回",
    actions: "操作",
    contextMenu: {
        openInNewTab: "在新分頁中開啟",
        delete: "刪除",
    },
    notification: {
        deleteNotification: "錄製已成功刪除",
        deleteFailedNotification: "刪除錄製失敗",
        startFailedNotification: "開始錄製失敗",
        stopFailedNotification: "停止錄製失敗",
        recordingStarted: "{name}已開始錄製。",
        downloadFailedNotification: "下載錄製失敗",
        recordingComplete: "錄製已完成",
        recordingIsInProgress: "錄製正在進行中",
        unexpectedlyStoppedNotification: "錄製意外停止了",
        recordingSaved: "您的錄製已成功儲存。",
        howToAccess: "若要存取您的錄製：",
        viewRecordings: "查看錄製",
    },
    actionbar: {
        title: {
            start: "開始錄製",
            stop: "停止錄製",
            inProgress: "錄製正在進行中",
        },
        desc: {
            needLogin: "您需要登入才能錄製。",
            needPremium: "您需要是進階會員才能錄製。",
            advert: "所有參與者都會收到您正在開始錄製的通知。",
            yourRecordInProgress: "錄製正在進行中，點選停止。",
            inProgress: "錄製正在進行中",
            notEnabled: "此世界已停用錄製。",
        },
        spacePicker: {
            megaphone: "錄製擴音器",
            discussion: "錄製討論",
        },
    },
};

export default recording;
