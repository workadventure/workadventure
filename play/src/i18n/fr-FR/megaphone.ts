import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        selectCamera: "Sélectionnez une caméra 📹",
        selectMicrophone: "Sélectionnez un microphone 🎙️",
        liveMessage: {
            startMegaphone: "Démarrer le mégaphone",
            goingToStream: "Vous allez diffuser",
            yourMicrophone: "votre microphone",
            yourCamera: "votre camera",
            title: "Message en direct",
            button: "Envoyer un message en direct",
            and: "et",
            toAll: "à tous les participants",
            confirm: "Confirmer",
            cancel: "Annuler",
        },
        textMessage: {
            title: "Message texte",
            notice: `
            Le text message permet d'envoyer un message à toutes les personnes connecté dans le salon ou le world.

            Ce message sera affiché sous forme de popup en haut de la page et sera accompagné d'un son permettant d'identifier qu'une information est à lire.

            Un exemple de message : "La conférence de la salle 3 commence dans 2 minutes 🎉. Vous pouvez vous rendre dans la zone de conférence 3 et ouvire l'application de visio 🚀"
        `,
            button: "Envoyer un message texte",
        },
        audioMessage: {
            title: "Message audio",
            notice: `
            L'audio message est un message de type "MP3, OGG..." envoyé à tous les utilisateurs connecté dans le salon ou dans le world.

            Ce message audio sera téléchargé et lancé à toute les personnes recevant cette notification.

            Un exemple de message auio peut être un enregistrement audio pour indiquer qu'une conférence va démarrer dans quelques minutes.
        `,
            button: "Envoyer un message audio",
        },
    },
};

export default megaphone;
