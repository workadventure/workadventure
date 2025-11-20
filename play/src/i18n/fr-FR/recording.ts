import type { BaseTranslation } from "../i18n-types";

const recording: BaseTranslation = {
    refresh: "Rafraîchir",
    title: "Votre liste d'enregistrements",
    noRecordings: "Aucun enregistrement trouvé",
    expireIn: "Expire dans {days} jour{s}",
    download: "Télécharger",
    close: "Fermer",
    ok: "Ok",
    recordingList: "Enregistrements",
    contextMenu: {
        openInNewTab: "Ouvrir dans un nouvel onglet",
        copyLink: "Copier le lien",
        delete: "Supprimer",
    },
    notification: {
        deleteNotification: "Enregistrement supprimé avec succès",
        recordingStarted: "Une personne dans la discussion a commencé un enregistrement.",
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
