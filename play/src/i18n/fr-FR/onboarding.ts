import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "Bienvenue sur {worldName} ! 🚀",
        description:
            "Préparez-vous à explorer un monde virtuel où vous pouvez vous déplacer, discuter avec d'autres personnes et collaborer en temps réel. Faisons un petit tour pour vous aider à démarrer !",
    },
    movement: {
        title: "Se déplacer",
        descriptionDesktop:
            "Utilisez les touches fléchées ou WASD pour déplacer votre personnage. Vous pouvez aussi cliquer droit pour vous déplacer. Essayez de bouger maintenant !",
        descriptionTouch:
            "Appuyez sur la carte pour vous y rendre, et faites-la glisser pour regarder autour de vous. Essayez de bouger maintenant !",
        next: "Suivant",
    },
    communication: {
        title: "Bulles de communication",
        description:
            "Lorsque vous vous approchez d'autres joueurs, vous entrez automatiquement dans une bulle de communication. Vous pouvez discuter avec les autres dans la même bulle !",
    },
    lockBubble: {
        title: "Verrouiller votre conversation",
        description:
            "Cliquez sur le bouton de verrouillage pour empêcher les autres de rejoindre votre bulle de conversation. C'est utile pour les discussions privées !",
    },
    screenSharing: {
        title: "Partager votre écran",
        description:
            "Partagez votre écran avec les autres dans votre bulle de conversation. Parfait pour les présentations et la collaboration !",
    },
    pictureInPicture: {
        title: "Picture in Picture",
        description:
            "Utilisez le mode Picture in Picture pour garder les appels vidéo visibles pendant que vous naviguez sur la carte. Idéal pour le multitâche !",
    },
    complete: {
        title: "Vous êtes prêt ! 🎉",
        description:
            "Vous avez appris les bases de {worldName} ! N'hésitez pas à explorer, rencontrer de nouvelles personnes et vous amuser. Vous pouvez toujours accéder à l'aide depuis le menu si nécessaire.",
    },
    tips: {
        label: "Astuce",
        next: "Suivant",
        previous: "Précédent",
        gotIt: "J'ai compris",
        close: "Fermer",
        stopShowing: "Ne plus afficher d'astuces",
        restartTutorial: "Relancer le tutoriel",
        showMe: "Montrez-moi",
        notNow: "Plus tard",
    },
    help: {
        inConversation: "Pendant une conversation",
        inMapEditor: "Dans l'éditeur de carte",
        notHere: "Pas disponible ici pour le moment",
        remindMe: "Me le rappeler",
        showTips: "Afficher les astuces automatiquement",
    },
    releaseNotes: {
        title: "Nouveautés de WorkAdventure {version}",
    },
    mapEditorTour: {
        title: "Placer du mobilier avec l'éditeur de carte",
        openMenu: {
            title: "Faites de ce lieu le vôtre",
            text: "Vous pouvez modifier cette carte. Ouvrez le menu **{menu}** pour commencer.",
        },
        openEditor: "Cliquez sur **{editor}**.",
        placeObject: {
            title: "Placer du mobilier",
            text: "Choisissez un objet dans cette liste, puis cliquez sur la carte pour le placer.",
        },
    },
} satisfies Translation["onboarding"];
