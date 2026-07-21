import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "Dźěleny wobraz komentować",
    stopAnnotating: "Komentowanje skónčić",
    tools: {
        pen: "Pisak",
        line: "Linija",
        arrow: "Šipk",
        rect: "Praworóžk",
        text: "Tekst",
        eraser: "Gumij",
    },
    color: "Barba",
    undo: "Wróćić",
    clearAll: "Wšitko zhašeć",
    allowAnnotations: "Druhim komentowanje dowolić",
    disallowAnnotations: "Druhim komentowanje zakazać",
    textPlaceholder: "Tekst zapodać…",
};

export default screenAnnotation;
