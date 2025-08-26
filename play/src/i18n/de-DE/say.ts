import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "Sagen",
        think: "Denken",
    },
    placeholder: "Geben Sie hier Ihre Nachricht ein...",
    button: "Sprechblase erstellen",
    tooltip: {
        description: {
            say: "Zeigt eine Sprechblase über Ihrem Charakter an. Für alle auf der Karte sichtbar, wird sie 5 Sekunden lang angezeigt.",
            think: "Zeigt eine Denkblase über Ihrem Charakter an. Für alle Spieler auf der Karte sichtbar, wird sie angezeigt, solange Sie sich nicht bewegen.",
        },
    },
};

export default say;
