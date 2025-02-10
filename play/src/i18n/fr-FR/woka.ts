import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Personnalisez votre Woka",
        navigation: {
            return: "Retour",
            back: "Précédent",
            finish: "Terminer",
            next: "Suivant",
            backTodefaultWoka: "Retour au WOKA par défaut",
        },
    },
    selectWoka: {
        title: "Sélectionnez votre Woka",
        continue: "Continuer",
        customize: "Personnaliser",
    },
    menu: {
        businessCard: "Carte de visite",
    },
};

export default woka;
