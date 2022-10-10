import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Personnalisez votre WOKA",
        navigation: {
            return: "Retour",
            back: "Précédent",
            finish: "Terminer",
            next: "Suivant",
        },
    },
    selectWoka: {
        title: "Sélectionnez votre WOKA",
        continue: "Continuer",
        customize: "Personnalisez votre WOKA",
    },
    menu: {
        businessCard: "Carte de visite",
    },
};

export default woka;
