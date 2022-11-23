import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "Bloquer",
        content: "Bloquer toute communication en provenance et à destination de {userName}. Cela peut être annulé.",
        unblock: "Débloquer cet utilisateur",
        block: "Bloquer cet utilisateur",
    },
    title: "Signaler",
    content: "Signaler aux administrateurs de cette salle. Ils pourront par la suite bannir cet utilisateur.",
    message: {
        title: "Votre message: ",
        empty: "Le message du signalement ne peut pas être vide.",
        error: "Erreur d'envoi du message, veullez contacter l'administrateur.",
    },
    submit: "Signaler cet utilisateur",
    moderate: {
        title: "Modérer {userName}",
        block: "Bloquer",
        report: "Signaler",
        noSelect: "ERREUR : Il n'y a pas d'action sélectionnée.",
    },
};

export default report;
