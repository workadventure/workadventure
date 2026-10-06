import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "التعليق على الشاشة المشتركة",
    stopAnnotating: "إيقاف التعليق",
    tools: {
        pen: "قلم",
        line: "خط",
        arrow: "سهم",
        rect: "مستطيل",
        text: "نص",
        eraser: "ممحاة",
    },
    color: "اللون",
    undo: "تراجع",
    clearAll: "مسح الكل",
    allowAnnotations: "السماح للآخرين بالتعليق",
    disallowAnnotations: "منع الآخرين من التعليق",
    textPlaceholder: "اكتب نصًا…",
};

export default screenAnnotation;
