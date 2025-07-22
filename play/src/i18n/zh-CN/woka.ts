import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "自定义你的WOKA",
        navigation: {
            return: "返回",
            back: "上一个",
            finish: "完成",
            next: "下一个",
        },
    },
    selectWoka: {
        title: "选择你的WOKA",
        continue: "继续",
        customize: "自定义你的 WOKA",
    },
    menu: {
        businessCard: "名片",
    },
};

export default woka;
