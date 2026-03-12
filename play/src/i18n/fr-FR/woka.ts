import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Personnalisez votre Woka",
        navigation: {
            finish: "Terminer",
            backToDefaultWoka: "Retour au WOKA par défaut",
        },
        randomize: "Aléatoire",
    },
    selectWoka: {
        title: "Sélectionnez votre Woka",
        continue: "Continuer",
        customize: "Personnaliser",
        randomize: "Sélectionner aléatoirement",
    },
    menu: {
        businessCard: "Carte de visite",
    },
};

export default woka;
