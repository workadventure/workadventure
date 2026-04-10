import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "WOKA 만들기",
        navigation: {
            finish: "완료",
            backToDefaultWoka: "기본 WOKA로 돌아가기",
        },
        randomize: "무작위 생성",
    },
    selectWoka: {
        title: "WOKA를 선택하세요",
        continue: "계속하기",
        customize: "WOKA 만들기",
        randomize: "무작위 선택",
    },
    menu: {
        businessCard: "명함",
    },
};

export default woka;
