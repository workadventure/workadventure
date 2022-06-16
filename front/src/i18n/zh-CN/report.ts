import type { Translation } from "../i18n-types";

const report: NonNullable<Translation["report"]> = {
    block: {
        title: "屏蔽",
        content: "屏蔽任何来自 {userName} 的通信。该操作是可逆的。",
        unblock: "解除屏蔽该用户",
        block: "屏蔽该用户",
    },
    ban: {
        // TODO TRANSLATE
        title: "Banish",
        content: "Ban user {userName} from the running world. This can be cancelled from the administration.",
        ban: "Ban this user",
    },
    title: "举报",
    content: "发送举报信息给这个房间的管理员，他们后续可能禁用该用户。",
    message: {
        title: "举报信息: ",
        empty: "举报信息不能为空.",
    },
    submit: "举报该用户",
    moderate: {
        title: "Moderate {userName}",
        block: "屏蔽",
        report: "举报",
        noSelect: "错误：未选择行为。",
        ban: "Ban", // TODO translate
    },
};

export default report;
