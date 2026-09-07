import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "Annota lo schermo condiviso",
    stopAnnotating: "Smetti di annotare",
    tools: {
        pen: "Penna",
        line: "Linea",
        arrow: "Freccia",
        rect: "Rettangolo",
        text: "Testo",
        eraser: "Gomma",
    },
    color: "Colore",
    undo: "Annulla",
    clearAll: "Cancella tutto",
    allowAnnotations: "Consenti agli altri di annotare",
    disallowAnnotations: "Impedisci agli altri di annotare",
    textPlaceholder: "Scrivi del testo…",
};

export default screenAnnotation;
