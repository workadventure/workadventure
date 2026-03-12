import type { Translation } from "../i18n-types.ts";

export default {
    welcome: {
        title: "Bienvenue sur {worldName} ! 🚀",
        description:
            "Préparez-vous à explorer un monde virtuel où vous pouvez vous déplacer, discuter avec d'autres personnes et collaborer en temps réel. Faisons un petit tour pour vous aider à démarrer !",
        start: "C'est parti !",
        skip: "Passer le tutoriel",
    },
    movement: {
        title: "Se déplacer",
        descriptionDesktop:
            "Utilisez les touches fléchées ou WASD pour déplacer votre personnage. Vous pouvez aussi cliquer droit pour vous déplacer. Essayez de bouger maintenant !",
        descriptionMobile:
            "Utilisez le joystick ou appuyez sur la carte pour déplacer votre personnage. Essayez de bouger maintenant !",
        next: "Suivant",
    },
    communication: {
        title: "Bulles de communication",
        description:
            "Lorsque vous vous approchez d'autres joueurs, vous entrez automatiquement dans une bulle de communication. Vous pouvez discuter avec les autres dans la même bulle !",
        video: "./static/Videos/Meet.mp4",
        next: "Compris !",
    },
    lockBubble: {
        title: "Verrouiller votre conversation",
        description:
            "Cliquez sur le bouton de verrouillage pour empêcher les autres de rejoindre votre bulle de conversation. C'est utile pour les discussions privées !",
        video: "./static/Videos/LockBubble.mp4",
        hint: "Cliquez sur le bouton de verrouillage mis en évidence pour l'essayer !",
        next: "Suivant",
    },
    screenSharing: {
        title: "Partager votre écran",
        description:
            "Partagez votre écran avec les autres dans votre bulle de conversation. Parfait pour les présentations et la collaboration !",
        video: "./static/images/screensharing.mp4",
        hint: "Cliquez sur le bouton de partage d'écran mis en évidence pour commencer à partager !",
        next: "Suivant",
    },
    pictureInPicture: {
        title: "Image dans l'image",
        description:
            "Utilisez le mode Image dans l'image pour garder les appels vidéo visibles pendant que vous naviguez sur la carte. Idéal pour le multitâche !",
        video: "./static/Videos/PictureInPicture.mp4",
        hint: "Cliquez sur le bouton PiP mis en évidence pour l'activer !",
        next: "Suivant",
    },
    complete: {
        title: "Vous êtes prêt ! 🎉",
        description:
            "Vous avez appris les bases de {worldName} ! N'hésitez pas à explorer, rencontrer de nouvelles personnes et vous amuser. Vous pouvez toujours accéder à l'aide depuis le menu si nécessaire.",
        finish: "Commencer à explorer !",
    },
} satisfies Translation["onboarding"];
