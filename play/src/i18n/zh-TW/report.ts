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
    },
};

export default report;
