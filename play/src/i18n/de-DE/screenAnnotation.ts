import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "Geteilten Bildschirm kommentieren",
    stopAnnotating: "Kommentieren beenden",
    tools: {
        pen: "Stift",
        line: "Linie",
        arrow: "Pfeil",
        rect: "Rechteck",
        text: "Text",
        eraser: "Radierer",
    },
    color: "Farbe",
    undo: "Rückgängig",
    clearAll: "Alles löschen",
    allowAnnotations: "Anderen das Kommentieren erlauben",
    disallowAnnotations: "Anderen das Kommentieren verbieten",
    textPlaceholder: "Text eingeben…",
};

export default screenAnnotation;
