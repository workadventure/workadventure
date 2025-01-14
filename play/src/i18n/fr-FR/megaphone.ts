import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        selectCamera: "Sélectionnez une caméra",
        selectMicrophone: "Sélectionnez un microphone",
        liveMessage: {
            startMegaphone: "Démarrer un live",
            stopMegaphone: "Arrêter le live",
            goingToStream: "Vous allez diffuser",
            yourMicrophone: "votre microphone",
            yourCamera: "votre camera",
            title: "Live message",
            button: "Démarrer un live",
            and: "et",
            toAll: "à tous les participants",
            confirm: "Confirmer",
            cancel: "Annuler",
            notice: `Le Live ou "Mégaphone" vous permet de streamer votre caméra et votre microphone à toutes les personnes connectées dans le salon et/ou le world.
            
            Ce message sera affiché en bas de l'écran, comme une vidéo ou une bulle de discussion.
            
            Un exemple d'utilisation du live : "Bonjour à tous, on commence la conférence ? 🎉 Suivez mon avatar jusqu'à la zone de conférence et ouvrez l'application de visio 🚀"
            `,
            settings: "Paramètres",
        },
        textMessage: {
            title: "Message texte",
            notice: `
            Le text message permet d'envoyer un message à toutes les personnes connectées dans le salon ou le world.

            Ce message sera affiché sous forme de popup en haut de la page et sera accompagné d'un son permettant d'identifier qu'une information est à lire.

            Un exemple de message : "La conférence de la salle 3 commence dans 2 minutes 🎉. Vous pouvez vous rendre dans la zone de conférence 3 et ouvrir l'application de visio 🚀"
            `,
            button: "Envoyer un message texte",
            noAccess: "Vous n'avez pas accès à cette fonctionnalité 😱 Veuillez contacter l'administrateur 🙏",
        },
        audioMessage: {
            title: "Message audio",
            notice: `
            L'audio message est un message de type "MP3, OGG..." envoyé à tous les utilisateurs connecté dans le salon ou dans le world.

            Ce message audio sera téléchargé et lancé à toutes les personnes recevant cette notification.

            Un exemple de message audio peut être un enregistrement audio pour indiquer qu'une conférence va démarrer dans quelques minutes.
            `,
            button: "Envoyer un message audio",
            noAccess: "Vous n'avez pas accès à cette fonctionnalité 😱 Veuillez contacter l'administrateur 🙏",
        },
    },
};

export default megaphone;
