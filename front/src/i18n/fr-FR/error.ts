import type { Translation } from "../i18n-types";

const error: NonNullable<Translation["error"]> = {
    accessLink: {
        title: "Lien d'accès incorrect",
        subTitle: "Impossible de trouver la carte. Veuillez vérifier votre lien d'accès.",
        details:
            "Si vous souhaitez obtenir de plus amples informations, vous pouvez contacter l'administrateur ou nous contacter à l'adresse suivante: hello@workadventu.re",
    },
    connectionRejected: {
        title: "Connexion rejetée",
        subTitle: "Vous ne pouvez pas rejoindre le monde. Réessayer plus tard {error}.",
        details:
            "Si vous souhaitez obtenir de plus amples informations, vous pouvez contacter l'administrateur ou nous contacter à l'adresse suivante: hello@workadventu.re",
    },
    connectionRetry: {
        unableConnect: "Impossible de se connecter à WorkAdventure. Etes vous connecté à Internet?",
    },
    error: "Erreur",
};

export default error;
