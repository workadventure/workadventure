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
            placeholder: "Facultatif. {userName} verra ce message.",
        },
        adminOnly: "Réservé aux admins",
        cancel: "Annuler",
        hint: {
            block: "Ne plus le voir ni l'entendre. Pour vous seul, et réversible.",
            report: "Alerter les administrateurs.",
            kick: "Le déconnecter maintenant. Il pourra revenir.",
            ban: "Le déconnecter définitivement.",
        },
        kick: {
            title: "Exclure",
            content: "{userName} est déconnecté immédiatement, et pourra revenir plus tard.",
            submit: "Exclure",
            confirmTitle: "Exclure {userName}",
        },
        ban: {
            title: "Bannir du monde",
            content: "{userName} est déconnecté et ne pourra plus rejoindre ce monde avec ce compte.",
            submit: "Bannir",
            confirmTitle: "Bannir {userName} ?",
            confirmContent:
                "Un administrateur pourra lever le bannissement depuis la page « Utilisateurs bannis » du menu, si ce monde en dispose, ou depuis le back-office.",
            scope: {
                account: "Ce compte",
                ip: "Ce compte et son adresse IP",
                ipHint: "Bloque aussi les nouveaux comptes venant de la même connexion, et tous ceux qui la partagent (un bureau, une école…).",
                ipUnknown: "Indisponible : cet utilisateur n'est plus connecté.",
                ipShared: "Indisponible : vous partagez cette adresse IP et vous vous bloqueriez vous-même.",
                loading: "Recherche des personnes qui partagent cette adresse IP…",
                error: "Indisponible : impossible de vérifier qui partage cette adresse IP.",
                nobody: "Personne d'autre n'est connecté à ce monde depuis cette adresse IP en ce moment. Quelqu'un qui revient plus tard depuis celle-ci sera bloqué aussi.",
                others: "Bloqués aussi, connectés à ce monde depuis cette adresse IP en ce moment ({count}) :",
                submitWithOthers: "Bannir ces {count} personnes",
            },
        },
    },
    kicked: {
        title: "EXCLU",
        subtitle: "Un modérateur vous a exclu de cette map",
    },
    banned: {
        title: "BANNI",
        subtitle: "Vous avez été banni de WorkAdventure",
        details: "Pour plus d'informations, vous pouvez nous contacter à : hello@workadventu.re",
    },
    reasonGiven: "Motif : {reason}",
};

export default report;
