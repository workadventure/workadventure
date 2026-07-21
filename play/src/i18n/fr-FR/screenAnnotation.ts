import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "Annoter l'écran partagé",
    stopAnnotating: "Arrêter d'annoter",
    tools: {
        pen: "Crayon",
        line: "Ligne",
        arrow: "Flèche",
        rect: "Rectangle",
        text: "Texte",
        eraser: "Gomme",
    },
    color: "Couleur",
    undo: "Annuler",
    clearAll: "Tout effacer",
    allowAnnotations: "Autoriser les autres à annoter",
    disallowAnnotations: "Empêcher les autres d'annoter",
    textPlaceholder: "Saisir du texte…",
};

export default screenAnnotation;
