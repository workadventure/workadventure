import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "Sagen",
        think: "Denken",
    },
    placeholder: "Geben Sie hier Ihre Nachricht ein...",
    button: "Blase erstellen",
    tooltip: {
        description: {
            say: "Zeigt eine Chatblase über Ihrem Charakter an. Für alle sichtbar, die Ihren Charakter sehen können, bleibt sie 5 Sekunden lang angezeigt.",
            think: "Zeigt eine Denkblase über Ihrem Charakter an. Für alle sichtbar, die Ihren Charakter sehen können, bleibt sie angezeigt, solange Sie sich nicht bewegen.",
        },
    },
};

export default say;
