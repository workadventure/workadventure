import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "在分享畫面上標註",
    stopAnnotating: "停止標註",
    presenter: { laser: "雷射", spotlight: "聚光燈", loupe: "放大鏡" },
    tools: {
        pointer: "指標",
        pen: "畫筆",
        line: "直線",
        arrow: "箭頭",
        rect: "矩形",
        text: "文字",
        eraser: "橡皮擦",
    },
    color: "顏色",
    undo: "復原",
    clearAll: "全部清除",
    allowAnnotations: "允許他人標註",
    disallowAnnotations: "禁止他人標註",
    textPlaceholder: "輸入文字…",
};

export default screenAnnotation;
