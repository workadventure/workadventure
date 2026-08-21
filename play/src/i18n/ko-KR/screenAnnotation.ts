import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "공유 화면에 주석 달기",
    stopAnnotating: "주석 중지",
    tools: {
        pen: "펜",
        line: "선",
        arrow: "화살표",
        rect: "사각형",
        text: "텍스트",
        eraser: "지우개",
    },
    color: "색상",
    undo: "실행 취소",
    clearAll: "모두 지우기",
    allowAnnotations: "다른 사람의 주석 허용",
    disallowAnnotations: "다른 사람의 주석 금지",
    textPlaceholder: "텍스트 입력…",
};

export default screenAnnotation;
