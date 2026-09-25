import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "屏蔽",
        content: "屏蔽任何来自 {userName} 的通信。该操作是可逆的。",
        unblock: "解除屏蔽该用户",
        block: "屏蔽该用户",
    },
    title: "举报",
    content: "发送举报信息给这个房间的管理员，他们后续可能禁用该用户。",
    message: {
        title: "举报信息: ",
        empty: "举报信息不能为空.",
        error: "报告消息错误，您可以联系管理员.",
    },
    submit: "举报该用户",
    moderate: {
        title: "缓和 {userName}",
        block: "屏蔽",
        report: "举报",
        noSelect: "错误：未选择行为。",
        action: "管理",
        reason: {
            label: "原因",
            placeholder: "可选。保留给此世界的管理员。",
        },
        adminOnly: "仅限管理员",
        cancel: "取消",
        hint: {
            block: "不再看到和听到对方。仅对你生效，可撤销。",
            report: "通知此世界的管理员。",
            kick: "立即断开连接。对方可以再次加入。",
            ban: "永久断开连接。",
        },
        kick: {
            title: "移出地图",
            content: "{userName} 将被立即断开连接，之后可以再次加入。",
            submit: "移出",
        },
        ban: {
            title: "从世界封禁",
            content: "{userName} 将被断开连接，且无法再加入此世界，即使使用其他账号也不行。",
            submit: "封禁",
            confirmTitle: "永久封禁 {userName}？",
            confirmContent: "无法在游戏中撤销。只有管理员才能在后台解除封禁。",
        },
    },
    kicked: {
        title: "已被移出",
        subtitle: "管理员已将你移出此地图",
        details: "刷新页面以重新加入。",
    },
    banned: {
        title: "已被封禁",
        subtitle: "你已被 WorkAdventure 封禁",
        details: "如需更多信息，请联系我们：hello@workadventu.re",
    },
    reasonGiven: "原因：{reason}",
};

export default report;
