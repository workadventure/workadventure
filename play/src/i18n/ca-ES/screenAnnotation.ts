import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "Anota la pantalla compartida",
    stopAnnotating: "Atura l'anotació",
    tools: {
        pen: "Llapis",
        line: "Línia",
        arrow: "Fletxa",
        rect: "Rectangle",
        text: "Text",
        eraser: "Goma",
    },
    color: "Color",
    undo: "Desfés",
    clearAll: "Esborra-ho tot",
    allowAnnotations: "Permet que altres anotin",
    disallowAnnotations: "Impedeix que altres anotin",
    textPlaceholder: "Escriu text…",
};

export default screenAnnotation;
