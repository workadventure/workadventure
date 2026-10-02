import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "自訂你的 WOKA",
        navigation: {
            finish: "完成",
            backToDefaultWoka: "返回預設 WOKA",
        },
        randomize: "隨機選擇",
    },
    selectWoka: {
        title: "選擇你的 WOKA",
        continue: "繼續",
        customize: "自訂你的 WOKA",
        randomize: "隨機選擇",
    },
    menu: {
        businessCard: "名片",
    },
};

export default woka;
