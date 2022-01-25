import type { Translation } from "../i18n-types";

const warning: NonNullable<Translation["warning"]> = {
    title: "Attention!",
    content:
        'Ce monde est proche de sa limite ! Vous pouvez améliorer sa capacité <a href={upgradeLink} target="_blank">içi</a>',
    limit: "Ce monde est proche de ses limites!",
    accessDenied: {
        camera: "Accès à la caméra refusé. Cliquez ici et vérifiez les autorisations de votre navigateur.",
        screenSharing: "Partage d'écran refusé. Cliquez ici et vérifiez les autorisations de votre navigateur.",
    },
    importantMessage: "Message important",
    connectionLost: "Connexion perdue. Reconnexion...",
};

export default warning;
