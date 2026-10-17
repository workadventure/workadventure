import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "Dir",
        think: "Pensar",
    },
    placeholder: "Escriu el teu missatge aquí...",
    button: "Crear una bombolla",
    tooltip: {
        description: {
            say: "Mostra una bombolla de xat sobre el teu personatge. Visible per a qualsevol persona que vegi el teu personatge, roman visible durant 5 segons.",
            think: "Mostra una bombolla de pensament sobre el teu personatge. Visible per a qualsevol persona que vegi el teu personatge, roman visible mentre no et moguis.",
        },
    },
};

export default say;
