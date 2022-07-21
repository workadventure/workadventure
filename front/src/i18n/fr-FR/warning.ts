import { DeepPartial } from "../../Utils/DeepPartial";
import type { Translation } from "../i18n-types";
import { ADMIN_URL } from "../../Enum/EnvironmentVariable";

const upgradeLink = ADMIN_URL + "/pricing";

const warning: DeepPartial<Translation["warning"]> = {
    title: "Attention!",
    content: `Ce monde est proche de sa limite ! Vous pouvez améliorer sa capacité <a href="${upgradeLink}" target="_blank">içi</a>`,
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
};

export default warning;
