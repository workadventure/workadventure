import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "Envoyer une annonce",
        audience: "Qui la reçoit ?",
        thisRoom: "Cette salle",
        wholeWorld: "Tout le monde",
        place: "Lieu à rejoindre (facultatif)",
        noPlace: "Aucun lieu",
        noPlaceOnMap: "Cette carte n'a pas encore de zone nommée.",
        preview: "Aperçu",
        sendToRoom: "Envoyer à cette salle",
        sendToWorld: "Envoyer à tout le monde",
        confirmWorld: "Toutes les salles du monde la recevront.",
        confirmSend: "Oui, envoyer à tout le monde",
        cancel: "Annuler",
        sentToRoom: "Annonce envoyée à cette salle",
        sentToWorld: "Annonce envoyée à tout le monde",
        join: "Rejoindre {place}",
        joinMap: "Rejoindre",
        placeNotFound: "Ce lieu n'existe plus sur la carte.",
        admin: "Administrateur",
        more: "Annonces en attente : {count}",
    },
    modal: {
        liveMessage: {
            startMegaphone: "Démarrer un live",
            stopMegaphone: "Arrêter le live",
            goingToStream: "Vous allez diffuser",
            yourMicrophone: "votre microphone",
            yourCamera: "votre caméra",
            yourScreen: "votre écran",
            title: "Mégaphone",
            and: "et",
            toAll: "à tous les participants",
            settings: "Paramètres",
        },
    },
};

export default megaphone;
