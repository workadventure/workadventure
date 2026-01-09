import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "Decir",
        think: "Pensar",
    },
    placeholder: "Escribe tu mensaje aquí...",
    button: "Crear una burbuja",
    tooltip: {
        description: {
            say: "Muestra una burbuja de chat sobre tu personaje. Visible para todos en el mapa, permanece visible durante 5 segundos.",
            think: "Muestra una burbuja de pensamiento sobre tu personaje. Visible para todos los jugadores en el mapa, permanece visible mientras no te muevas.",
        },
    },
};

export default say;
