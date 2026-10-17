import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "Dire",
        think: "Penser",
    },
    placeholder: "Tapez votre message ici...",
    button: "Créer une bulle",
    tooltip: {
        description: {
            say: "Affiche une bulle de discussion au-dessus de votre personnage. Visible par tous ceux qui voient votre personnage, elle reste affichée pendant 5 secondes.",
            think: "Affiche une bulle de pensée au-dessus de votre personnage. Visible par tous ceux qui voient votre personnage, elle reste affichée tant que vous ne bougez pas.",
        },
    },
};

export default say;
