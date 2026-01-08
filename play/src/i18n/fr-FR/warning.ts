import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "Attention!",
    content: `Ce monde est proche de sa limite ! Vous pouvez améliorer sa capacité <a href="{upgradeLink}" target="_blank">içi</a>`,
    limit: "Ce monde est proche de ses limites!",
    accessDenied: {
        camera: "Accès à la caméra refusé. Cliquez ici et vérifiez les autorisations de votre navigateur.",
        screenSharing: "Partage d'écran refusé. Cliquez ici et vérifiez les autorisations de votre navigateur.",
        teleport: "Vous n'avez pas le droit de vous téléporter vers cet utilisateur.",
        room: "Accès à la pièce refusé. Vous n'avez pas les autorisations nécessaires pour entrer dans cette pièce.",
    },
    importantMessage: "Message important",
    connectionLost: "Connexion perdue. Reconnexion...",
    connectionLostTitle: "Connexion perdue",
    connectionLostSubtitle: "Reconnexion",
    waitingConnectionTitle: "En attente du serveur",
    waitingConnectionSubtitle: "Connexion",
    megaphoneNeeds: "Pour utiliser le megaphone, vous devez activer votre caméra ou votre microphone.",
    mapEditorShortCut: "Une erreur est survenue lors de l’ouverture de l’éditeur de carte.",
    mapEditorNotEnabled: "L’éditeur de carte n’est pas activé sur ce monde.",
    popupBlocked: {
        title: "Bloqueur de fenêtre pop-up",
        content: "Veuillez autoriser les fenêtres pop-up pour ce site dans les paramètres de votre navigateur.",
        done: "Ok",
    },
    backgroundProcessing: {
        failedToApply: "Échec de l'application des effets de fond",
    },
    browserNotSupported: {
        title: "😢 Navigateur non supporté",
        message: "Votre navigateur ({browserName}) n'est plus supporté par WorkAdventure.",
        description:
            "Votre navigateur est trop ancien pour exécuter WorkAdventure. Veuillez le mettre à jour vers la dernière version pour continuer.",
        whatToDo: "Que pouvez-vous faire ?",
        option1: "Mettre à jour {browserName} vers la dernière version",
        option2: "Quitter WorkAdventure et utiliser un autre navigateur",
        updateBrowser: "Mettre à jour le navigateur",
        leave: "Quitter",
    },
};

export default warning;
