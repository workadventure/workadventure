import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "自定义你的WOKA",
        navigation: {
            finish: "完成",
            backToDefaultWoka: "返回默认WOKA",
        },
        randomize: "随机选择",
    },
    selectWoka: {
        title: "选择你的WOKA",
        continue: "继续",
        customize: "自定义你的 WOKA",
        randomize: "随机选择",
    },
    menu: {
        businessCard: "名片",
    },
};

export default woka;
