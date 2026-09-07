import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "Anotar na tela compartilhada",
    stopAnnotating: "Parar de anotar",
    tools: {
        pen: "Caneta",
        line: "Linha",
        arrow: "Seta",
        rect: "Retângulo",
        text: "Texto",
        eraser: "Borracha",
    },
    color: "Cor",
    undo: "Desfazer",
    clearAll: "Limpar tudo",
    allowAnnotations: "Permitir que outros anotem",
    disallowAnnotations: "Impedir que outros anotem",
    textPlaceholder: "Digite o texto…",
};

export default screenAnnotation;
