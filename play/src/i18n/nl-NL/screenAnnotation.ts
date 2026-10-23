import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "Gedeeld scherm annoteren",
    stopAnnotating: "Stoppen met annoteren",
    tools: {
        pen: "Pen",
        line: "Lijn",
        arrow: "Pijl",
        rect: "Rechthoek",
        text: "Tekst",
        eraser: "Gum",
    },
    color: "Kleur",
    undo: "Ongedaan maken",
    clearAll: "Alles wissen",
    allowAnnotations: "Anderen laten annoteren",
    disallowAnnotations: "Anderen niet laten annoteren",
    textPlaceholder: "Typ tekst…",
};

export default screenAnnotation;
