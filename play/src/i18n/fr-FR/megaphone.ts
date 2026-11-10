import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        backToSelectCommunication: "Retour à la sélection de communication",
        title: "Communication globale",
        liveMessage: {
            startMegaphone: "Démarrer un live",
            stopMegaphone: "Arrêter le live",
            goingToStream: "Vous allez diffuser",
            yourMicrophone: "votre microphone",
            yourCamera: "votre caméra",
            yourScreen: "votre écran",
            title: "Mégaphone",
            button: "Démarrer un live",
            and: "et",
            toAll: "à tous les participants",
            notice: `Le Live ou "Mégaphone" vous permet de diffuser votre caméra et votre microphone à toutes les personnes connectées dans le salon et/ou le monde.
            
            Ce message sera affiché en bas de l'écran, comme une vidéo ou une bulle de discussion.
            
            Un exemple d'utilisation du live : "Bonjour à tous, on commence la conférence ? 🎉 Suivez mon avatar jusqu'à la zone de conférence et ouvrez l'application de visio 🚀"
            `,
            settings: "Paramètres",
        },
        textMessage: {
            title: "Message texte",
            notice: `
            Le message texte permet d'envoyer un message à toutes les personnes connectées dans le salon ou le monde.

            Ce message sera affiché sous forme de popup en haut de la page et sera accompagné d'un son permettant d'identifier qu'une information est à lire.

            Un exemple de message : "La conférence de la salle 3 commence dans 2 minutes 🎉. Vous pouvez vous rendre dans la zone de conférence 3 et ouvrir l'application de visio 🚀"
            `,
            button: "Envoyer un message texte",
            noAccess: "Vous n'avez pas accès à cette fonctionnalité 😱 Veuillez contacter l'administrateur 🙏",
        },
    },
};

export default megaphone;
