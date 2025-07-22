import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "WOKA をカスタマイズします",
        navigation: {
            finish: "完了",
            backToDefaultWoka: "標準の WOKA に戻す",
        },
        randomize: "ランダム選択",
    },
    selectWoka: {
        title: "WOKA を選択してください",
        continue: "続ける",
        customize: "WOKA のカスタマイズ",
        randomize: "ランダムに選択する",
    },
    menu: {
        businessCard: "名刺",
    },
};

export default woka;
