import type { BaseTranslation } from "../i18n-types";

const recording: BaseTranslation = {
    refresh: "Rafraîchir",
    title: "Votre liste d'enregistrements",
    noRecordings: "Aucun enregistrement trouvé",
    errorFetchingRecordings: "Erreur lors de la récupération des enregistrements",
    expireIn: "Expire dans {days} jour{s}",
    download: "Télécharger",
    close: "Fermer",
    ok: "Ok",
    recordingList: "Enregistrements",
    contextMenu: {
        openInNewTab: "Ouvrir dans un nouvel onglet",
        delete: "Supprimer",
    },
    notification: {
        deleteNotification: "Enregistrement supprimé avec succès",
        deleteFailedNotification: "Échec de la suppression de l'enregistrement",
        recordingStarted: "Une personne dans la discussion a commencé un enregistrement.",
        downloadFailedNotification: "Échec du téléchargement de l'enregistrement",
    },
    actionbar: {
        help: {
            desc: {
                start: "Commencer un enregistrement",
                stop: "Arrêter un enregistrement",
                inProgress: "Un enregistrement est en cours",
            },
        },
    },
};

export default recording;
