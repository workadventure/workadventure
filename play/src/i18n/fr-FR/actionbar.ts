import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "C'est compris",
    edit: "Modifier",
    cancel: "Annuler",
    close: "Fermer",
    login: "Se connecter",
    //logout: "Se déconnecter",
    map: "Outils",
    startScreenSharing: "Partager mon écran",
    stopScreenSharing: "Arrêter le partage",
    screenSharingMode: "Mode partage d'écran",
    profil: "Mon nom",
    woka: "Mon avatar",
    companion: "Mon compagnon",
    //megaphone: "Utiliser le mégaphone",
    calendar: "Calendrier",
    todoList: "Liste de tâches",
    test: "Tester",
    editCamMic: "Camera / micro",
    allSettings: "Tous les paramètres",
    globalMessage: "Envoyer un message global",
    mapEditor: "Éditer la carte",
    mapEditorMobileLocked: "L'éditeur de carte est verrouillé en mode mobile",
    mapEditorLocked: "L'éditeur de carte est verrouillé 🔐",
    app: "Applications",
    camera: {
        disabled: "Votre caméra est désactivé",
        activate: "Activer votre camera",
        noDevices: "Aucune caméra trouvée",
        setBackground: "Définir le fond",
        blurEffects: "Effets de flou",
        disableBackgroundEffects: "Désactiver les effets de fond",
        close: "Fermer",
    },
    microphone: {
        disabled: "Votre micro est désactivé",
        activate: "Activer votre micro",
        noDevices: "Aucun micro trouvé",
    },
    speaker: {
        disabled: "Votre haut-parleur est désactivé",
        activate: "Activer votre haut-parleur",
        noDevices: "Aucun haut-parleur trouvé",
    },
    status: {
        ONLINE: "En ligne",
        AWAY: "Absent",
        BACK_IN_A_MOMENT: "De retour bientôt",
        DO_NOT_DISTURB: "Ne pas déranger",
        BUSY: "Occupé",
        OFFLINE: "Hors ligne",
        SILENT: "Silencieux",
        JITSI: "En réunion",
        BBB: "En réunion",
        DENY_PROXIMITY_MEETING: "Non disponible",
        SPEAKER: "En réunion",
        LIVEKIT: "En réunion",
        LISTENER: "En réunion",
    },
    subtitle: {
        camera: "Camera",
        microphone: "Microphone",
        speaker: "Sortie audio",
    },
    help: {
        chat: {
            title: "Envoyer un message par écrit",
            desc: "Partagez vos idées ou démarrez une discussion, directement par écrit. Simple, clair, efficace.",
        },
        users: {
            title: "Afficher la liste des utilisateurs",
            desc: "Voyez qui est présent, accédez à leur carte de visite, envoyez-leur un message ou marchez jusqu’à eux en un clic !",
        },
        emoji: {
            title: "Réagir avec un emoji",
            desc: "Exprimez ce que vous ressentez en un clic grâce aux réactions emoji. Un simple tap, et c’est parti !",
        },
        audioManager: {
            title: "Volume des sons ambiants",
            desc: "Réglez le volume des sons d'ambiance de la carte (musique, bruitages).",
            pause: "Cliquez ici pour mettre en pause l'audio",
            play: "Cliquez ici pour lire l'audio",
            stop: "Cliquez ici pour arrêter l'audio",
        },
        audioManagerNotAllowed: {
            title: "Sons ambiants bloqués",
            desc: "Votre navigateur a empêché la lecture des sons ambiants. Cliquez sur l'icône pour lancer la lecture.",
        },
        follow: {
            title: "Demander à vous suivre",
            desc: "Vous pouvez demander à un utilisateur de vous suivre, et si cette demande est acceptée, son Woka vous suivra automatiquement, établissant ainsi une connexion fluide.",
        },
        lock: {
            title: "Verrouiller la bulle",
            desc: "En activant cette fonctionnalité, vous garantissez que personne ne pourra rejoindre la discussion. Vous êtes maître de votre espace, et seules les personnes déjà présentes peuvent interagir.",
        },
        megaphone: {
            title: "Arrêter le mégaphone",
            desc: "Arrêtez la diffusion de votre message à tous les utilisateurs.",
        },
        mic: {
            title: "Activer/désactiver votre micro",
            desc: "Activez ou coupez votre micro pour que les autres vous entendent pendant la discussion.",
        },
        micDisabledByStatus: {
            title: "Micro désactivé",
            desc: "Votre micro est désactivé car votre statut est « {status} ».",
        },
        cam: {
            title: "Activer/désactiver votre caméra",
            desc: "Activez ou coupez votre caméra pour montrer votre vidéo aux autres participants.",
        },
        camDisabledByStatus: {
            title: "Caméra désactivée",
            desc: "Votre caméra est désactivée car votre statut est « {status} ».",
        },
        share: {
            title: "Partager votre écran",
            desc: "Vous voulez partager votre écran avec les autres utilisateurs ? C'est possible ! Vous pourrez montrer votre écran à tous les utilisateurs de la discussion et vous pous pouvez choisir de partager l'intégralité de votre écran ou seulement une fenêtre spécifique.",
        },
        unfollow: {
            title: "Arrêter de suivre",
            desc: "Vous pouvez choisir de ne plus suivre un utilisateur à tout moment. Votre Woka cessera alors de le suivre, vous redonnant votre liberté de mouvement.",
        },
        apps: {
            title: "Applications tierces",
            desc: "Vous avez la liberté de naviguer sur des applications externes tout en restant dans notre application, pour une expérience fluide et enrichie.",
        },
        roomList: {
            title: "Liste des salons",
            desc: "Parcourez la liste des salons pour voir qui est présent et rejoindre une conversation en un clic.",
        },
        calendar: {
            title: "Calendrier",
            desc: "Consultez vos réunions à venir et rejoignez-les directement depuis WorkAdventure.",
        },
        todolist: {
            title: "Liste de tâches",
            desc: "Gérez vos tâches du jour sans quitter votre espace de travail.",
        },
        pictureInPicture: {
            title: "Picture de Picture",
            descDisabled:
                "Malheureusement, cette fonctionnalité n'est pas disponible sur votre appareil ❌. Veuillez essayer d'utiliser un autre appareil ou navigateur, comme Chrome ou Edge, pour accéder à cette fonctionnalité.",
            desc: "Vous pouvez utiliser la fonctionnalité picture in picture pour regarder une vidéo ou une présentation pendant que vous êtes dans une conversation. Cliquez simplement sur l'icône picture in picture et profitez de votre contenu.",
        },
    },
    listStatusTitle: {
        enable: "Changer de statut",
    },
    //roomList: "Ouvrir / Fermer la liste des salons",
    externalModule: {
        status: {
            onLine: "Le statut est ok ✅",
            offLine: "Le statut est hors ligne ❌",
            warning: "Le statut est en avertissement ⚠️",
            sync: "Le statut est en synchronisation 🔄",
        },
    },
    //appList: "Liste des apps",
    featureNotAvailable: "Fonctionnalité non disponible pour votre salon 😭",
    issueReport: {
        menuAction: "Signaler un problème",
        formTitle: "Signaler un problème",
        emailLabel: "Email (non requise)",
        nameLabel: "Nom (non requise)",
        descriptionLabel: "Description* (requise)",
        descriptionPlaceholder: "Quel est le problème ? Qu'est-ce que tu attendais ?",
        submitButtonLabel: "Signaler un problème",
        cancelButtonLabel: "Annuler",
        confirmButtonLabel: "Confirmer",
        addScreenshotButtonLabel: "Ajouter une capture d'écran",
        removeScreenshotButtonLabel: "Supprimer la capture d'écran",
        successMessageText: "Merci pour votre signalement ! Nous l'examinerons dès que possible.",
        highlightToolText: "Mettre en évidence",
        hideToolText: "Masquer",
        removeHighlightText: "Supprimer",
    },
    personalDesk: {
        label: "Aller à mon bureau",
        unclaim: "Libérer mon bureau",
        errorNoUser: "Impossible de trouver vos informations utilisateur",
        errorNotFound: "Vous n'avez pas encore de bureau personnel",
        errorMoving: "Impossible d'atteindre votre bureau personnel",
        errorUnclaiming: "Impossible de libérer votre bureau personnel",
    },
};

export default actionbar;
