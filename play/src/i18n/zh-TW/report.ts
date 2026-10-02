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
            placeholder: "選填。{userName} 將會看到此訊息。",
        },
        adminOnly: "僅限管理員",
        cancel: "取消",
        hint: {
            block: "不再看到和聽到對方。僅對你生效，可復原。",
            report: "通知管理員。",
            kick: "立即中斷連線。對方可以再次加入。",
            ban: "永久中斷連線。",
        },
        kick: {
            title: "移出",
            content: "{userName} 將被立即中斷連線，之後可以再次加入。",
            submit: "移出",
            confirmTitle: "移出 {userName}",
        },
        ban: {
            title: "從世界封鎖",
            content: "{userName} 將被中斷連線，且無法再用此帳號加入此世界。",
            submit: "封鎖",
            confirmTitle: "永久封鎖 {userName}？",
            confirmContent: "管理員之後可以在選單的「被封鎖的使用者」頁面（若此世界提供）或後台解除封鎖。",
            scope: {
                account: "此帳號",
                ip: "此帳號及其 IP 位址",
                ipHint: "同時封鎖來自同一網路連線的新帳號，以及共用該連線的所有人（辦公室、學校等）。",
                ipUnknown: "無法使用：此使用者已不在線上。",
                ipShared: "無法使用：你與其共用此 IP 位址，會把自己也封鎖。",
                loading: "正在檢查誰在共用此 IP 位址…",
                error: "無法使用：無法檢查誰在共用此 IP 位址。",
                nobody: "目前沒有其他人透過此 IP 位址連線到此世界。之後從該位址回來的人也會被封鎖。",
                others: "同樣會被封鎖，目前透過此 IP 位址連線到此世界的人（{count}）：",
                submitWithOthers: "封鎖這 {count} 人",
            },
        },
    },
    kicked: {
        title: "已被移出",
        subtitle: "管理員已將你移出此地圖",
    },
    banned: {
        title: "已被封鎖",
        subtitle: "你已被 WorkAdventure 封鎖",
        details: "如需更多資訊，請聯絡我們：hello@workadventu.re",
    },
    reasonGiven: "原因：{reason}",
};

export default report;
