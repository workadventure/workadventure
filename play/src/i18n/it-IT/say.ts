import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "Dire",
        think: "Pensare",
    },
    placeholder: "Digita il tuo messaggio qui...",
    button: "Crea bolla",
    tooltip: {
        description: {
            say: "Mostra una bolla di chat sopra il tuo personaggio. Visibile a tutti sulla mappa, rimane visualizzata per 5 secondi.",
            think: "Mostra una bolla di pensiero sopra il tuo personaggio. Visibile a tutti i giocatori sulla mappa, rimane visualizzata finché non ti muovi.",
        },
    },
};

export default say;
