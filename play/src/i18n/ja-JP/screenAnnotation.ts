import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "共有画面に注釈を付ける",
    stopAnnotating: "注釈を終了",
    tools: {
        pen: "ペン",
        line: "直線",
        arrow: "矢印",
        rect: "四角形",
        text: "テキスト",
        eraser: "消しゴム",
    },
    color: "色",
    undo: "元に戻す",
    clearAll: "すべて消去",
    allowAnnotations: "他の参加者の注釈を許可",
    disallowAnnotations: "他の参加者の注釈を禁止",
    textPlaceholder: "テキストを入力…",
};

export default screenAnnotation;
