import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "在共享屏幕上批注",
    stopAnnotating: "停止批注",
    tools: {
        pen: "画笔",
        line: "直线",
        arrow: "箭头",
        rect: "矩形",
        text: "文字",
        eraser: "橡皮擦",
    },
    color: "颜色",
    undo: "撤销",
    clearAll: "全部清除",
    allowAnnotations: "允许他人批注",
    disallowAnnotations: "禁止他人批注",
    textPlaceholder: "输入文字…",
};

export default screenAnnotation;
