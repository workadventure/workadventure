import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "Rozdźěleny wobraz komentěrowaś",
    stopAnnotating: "Komentěrowanje skóńcyś",
    presenter: { laser: "Laser", spotlight: "Swětło", loupe: "Lupa" },
    tools: {
        pointer: "Pokazowak",
        pen: "Pisak",
        line: "Linija",
        arrow: "Šypka",
        rect: "Pšawokut",
        text: "Tekst",
        eraser: "Gumij",
    },
    color: "Barwa",
    undo: "Wótwołaś",
    clearAll: "Wšykno wulašowaś",
    allowAnnotations: "Drugim komentěrowanje dowóliś",
    disallowAnnotations: "Drugim komentěrowanje zakazaś",
    textPlaceholder: "Tekst zapódaś…",
};

export default screenAnnotation;
