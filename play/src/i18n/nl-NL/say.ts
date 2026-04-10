import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "Zeggen",
        think: "Denken",
    },
    placeholder: "Typ hier je bericht...",
    button: "Bubbel maken",
    tooltip: {
        description: {
            say: "Toont een chatbubbel boven je personage. Zichtbaar voor iedereen op de kaart, blijft 5 seconden weergegeven.",
            think: "Toont een gedachtebubbel boven je personage. Zichtbaar voor alle spelers op de kaart, blijft weergegeven zolang je niet beweegt.",
        },
    },
};

export default say;
