import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const emoji: DeepPartial<Translation["emoji"]> = {
    search: "搜索 emojis...",
    categories: {
        recents: "最近的 Emojis",
        smileys: "表情",
        people: "人物",
        animals: "动物和自然",
        food: "视频和饮料",
        activities: "活动",
        travel: "旅行和地点",
        objects: "物品",
        symbols: "符号",
        flags: "旗帜",
        custom: "自定义",
    },
    notFound: "未找到emoji",
};

export default emoji;
