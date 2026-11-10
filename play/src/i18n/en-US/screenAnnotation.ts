import type { BaseTranslation } from "../i18n-types";

const screenAnnotation: BaseTranslation = {
    startAnnotating: "Annotate the shared screen",
    stopAnnotating: "Stop annotating",
    presenter: { laser: "Laser", spotlight: "Spotlight", loupe: "Magnifier" },
    tools: {
        pointer: "Pointer",
        pen: "Pen",
        line: "Line",
        arrow: "Arrow",
        rect: "Rectangle",
        text: "Text",
        eraser: "Eraser",
    },
    color: "Color",
    undo: "Undo",
    clearAll: "Clear all",
    allowAnnotations: "Allow others to annotate",
    disallowAnnotations: "Stop others from annotating",
    textPlaceholder: "Type text…",
};

export default screenAnnotation;
