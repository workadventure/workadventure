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
            placeholder: "可选。{userName} 将看到此消息。",
        },
        adminOnly: "仅限管理员",
        cancel: "取消",
        hint: {
            block: "不再看到和听到对方。仅对你生效，可撤销。",
            report: "通知管理员。",
            remove: "将其移出此对话。仍留在地图上。",
            kick: "立即断开连接。对方可以再次加入。",
            ban: "永久断开连接。",
        },
        remove: {
            title: "移出对话",
            content: "{userName} 会立即离开此对话，如正在直播则停止直播。仍留在世界中。",
            submit: "移出对话",
            confirmTitle: "将 {userName} 移出对话",
        },
        kick: {
            title: "移出",
            content: "{userName} 将被立即断开连接，之后可以再次加入。",
            submit: "移出",
            confirmTitle: "移出 {userName}",
        },
        ban: {
            title: "从世界封禁",
            content: "{userName} 将被断开连接，且无法再用此账号加入此世界。",
            submit: "封禁",
            confirmTitle: "封禁 {userName}？",
            confirmContent: "管理员之后可以在菜单的“被封禁的用户”页面（如果此世界提供）或后台解除封禁。",
            scope: {
                account: "此账号",
                ip: "此账号及其 IP 地址",
                ipHint: "同时封禁来自同一网络连接的新账号，以及共享该连接的所有人（办公室、学校等）。",
                ipUnknown: "不可用：该用户已不在线。",
                ipShared: "不可用：你与其共享此 IP 地址，会把自己也封禁。",
                loading: "正在检查谁在共享此 IP 地址…",
                error: "不可用：无法检查谁在共享此 IP 地址。",
                nobody: "目前没有其他人通过此 IP 地址连接到此世界。之后从该地址回来的人也会被封禁。",
                others: "同样会被封禁，目前通过此 IP 地址连接到此世界的人（{count}）：",
                submitWithOthers: "封禁这 {count} 人",
            },
        },
    },
    kicked: {
        title: "已被移出",
        subtitle: "管理员已将你移出此地图",
    },
    banned: {
        title: "已被封禁",
        subtitle: "你已被 WorkAdventure 封禁",
        details: "如需更多信息，请联系我们：hello@workadventu.re",
    },
    reasonGiven: "原因：{reason}",
};

export default report;
