import type { Translation } from "../i18n-types.ts";
import type { DeepPartial } from "../DeepPartial.ts";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "Sagen",
        think: "Denken",
    },
    placeholder: "Geben Sie hier Ihre Nachricht ein...",
    button: "Blase erstellen",
    tooltip: {
        description: {
            say: "Zeigt eine Chatblase über Ihrem Charakter an. Für alle auf der Karte sichtbar, bleibt sie 5 Sekunden lang angezeigt.",
            think: "Zeigt eine Denkblase über Ihrem Charakter an. Für alle Spieler auf der Karte sichtbar, bleibt sie angezeigt, solange Sie sich nicht bewegen.",
        },
    },
};

export default say;
