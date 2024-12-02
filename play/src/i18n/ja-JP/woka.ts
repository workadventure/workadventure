import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "WOKA をカスタマイズします",
        navigation: {
            return: "戻る",
            back: "戻る",
            finish: "完了",
            next: "次へ",
            backTodefaultWoka: "標準の WOKA に戻す",
        },
    },
    selectWoka: {
        title: "WOKA を選択してください",
        continue: "続ける",
        customize: "WOKA のカスタマイズ",
    },
    menu: {
        businessCard: "名刺",
    },
};

export default woka;
