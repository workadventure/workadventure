import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "Anotar la pantalla compartida",
    stopAnnotating: "Dejar de anotar",
    tools: {
        pen: "Lápiz",
        line: "Línea",
        arrow: "Flecha",
        rect: "Rectángulo",
        text: "Texto",
        eraser: "Goma",
    },
    color: "Color",
    undo: "Deshacer",
    clearAll: "Borrar todo",
    allowAnnotations: "Permitir que otros anoten",
    disallowAnnotations: "Impedir que otros anoten",
    textPlaceholder: "Escribe texto…",
};

export default screenAnnotation;
