import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const chat: DeepPartial<Translation["chat"]> = {
    intro: "聊天历史:",
    enter: "输入消息...",
    menu: {
        visitCard: "访问卡",
        addFriend: "添加朋友",
    },
    typing: "在打字...",
};

export default chat;
