import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "封鎖",
        content: "封鎖任何來自 {userName} 的通訊。此操作是可逆的。",
        unblock: "解除封鎖該使用者",
        block: "封鎖該使用者",
    },
    title: "檢舉",
    content: "傳送檢舉訊息給這個房間的管理員，他們後續可能停權該使用者。",
    message: {
        title: "檢舉訊息：",
        empty: "檢舉訊息不能為空。",
        error: "回報訊息錯誤，您可以聯絡管理員。",
    },
    submit: "檢舉該使用者",
    moderate: {
        title: "管理 {userName}",
        block: "封鎖",
        report: "檢舉",
        noSelect: "錯誤：未選擇行為。",
        action: "管理",
        reason: {
            label: "原因",
            placeholder: "選填。保留給此世界的管理員。",
        },
        adminOnly: "僅限管理員",
        cancel: "取消",
        hint: {
            block: "不再看到和聽到對方。僅對你生效，可復原。",
            report: "通知此世界的管理員。",
            kick: "立即中斷連線。對方可以再次加入。",
            ban: "永久中斷連線。",
        },
        kick: {
            title: "移出地圖",
            content: "{userName} 將被立即中斷連線，之後可以再次加入。",
            submit: "移出",
        },
        ban: {
            title: "從世界封鎖",
            content: "{userName} 將被中斷連線，且無法再加入此世界，即使使用其他帳號也不行。",
            submit: "封鎖",
            confirmTitle: "永久封鎖 {userName}？",
            confirmContent: "無法在遊戲中復原。只有管理員才能在後台解除封鎖。",
        },
    },
    kicked: {
        title: "已被移出",
        subtitle: "管理員已將你移出此地圖",
        details: "重新整理頁面以重新加入。",
    },
    banned: {
        title: "已被封鎖",
        subtitle: "你已被 WorkAdventure 封鎖",
        details: "如需更多資訊，請聯絡我們：hello@workadventu.re",
    },
    reasonGiven: "原因：{reason}",
};

export default report;
