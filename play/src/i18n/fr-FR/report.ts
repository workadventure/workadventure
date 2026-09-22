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
        title: "Votre message : ",
        empty: "Le message du signalement ne peut pas être vide.",
        error: "Erreur d'envoi du message, veuillez contacter l'administrateur.",
    },
    submit: "Signaler cet utilisateur",
    moderate: {
        title: "Modérer {userName}",
        action: "Modérer",
        block: "Bloquer",
        report: "Signaler",
        noSelect: "ERREUR : Il n'y a pas d'action sélectionnée.",
        reason: {
            label: "Motif",
            placeholder: "Facultatif. Conservé pour les administrateurs de ce monde.",
        },
        adminOnly: "Réservé aux admins",
        cancel: "Annuler",
        hint: {
            block: "Ne plus le voir ni l'entendre. Pour vous seul, et réversible.",
            report: "Alerter les administrateurs de ce monde.",
            kick: "Le déconnecter maintenant. Il pourra revenir.",
            ban: "Le déconnecter définitivement.",
        },
        kick: {
            title: "Exclure de la map",
            content: "{userName} est déconnecté immédiatement, et pourra revenir plus tard.",
            submit: "Exclure",
        },
        ban: {
            title: "Bannir du monde",
            content: "{userName} est déconnecté et ne pourra plus rejoindre ce monde, même avec un autre compte.",
            submit: "Bannir",
            confirmTitle: "Bannir {userName} définitivement ?",
            confirmContent:
                "C'est irréversible depuis le jeu. Seul un administrateur peut lever le bannissement depuis le back-office.",
        },
    },
    kicked: {
        title: "EXCLU",
        subtitle: "Un modérateur vous a exclu de cette map",
        details: "Rechargez la page pour revenir.",
    },
    banned: {
        title: "BANNI",
        subtitle: "Vous avez été banni de WorkAdventure",
        details: "Pour plus d'informations, vous pouvez nous contacter à : hello@workadventu.re",
    },
    reasonGiven: "Motif : {reason}",
};

export default report;
