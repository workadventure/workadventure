import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "C'est compris",
    edit: "Modifier",
    cancel: "Annuler",
    close: "Fermer",
    login: "Se connecter",
    //logout: "Se déconnecter",
    map: "Map",
    startScreenSharing: "Partager mon écran",
    stopScreenSharing: "Arrêter le partage",
    screenSharingMode: "Mode partage d'écran",
    focusMode: "Mode focus",
    rightMode: "Passer les caméras à droite",
    hideMode: "Réduire les caméras",
    lightMode: "Thème clair",
    profil: "Mon nom",
    woka: "Mon avatar",
    companion: "Mon compagnon",
    //megaphone: "Utiliser le mégaphone",
    calendar: "Calendrier",
    todoList: "Liste de tâches",
    test: "Tester",
    editCamMic: "Camera / micro",
    allSettings: "Tous les paramètres",
    bo: "Back office",
    globalMessage: "Envoyer un message global",
    mapEditor: "Éditeur de carte",
    mapEditorMobileLocked: "L'éditeur de carte est verrouillé en mode mobile",
    mapEditorLocked: "L'éditeur de carte est verrouillé 🔐",
    app: "Applications",
    camera: {
        disabled: "Votre caméra est désactivé",
        activate: "Activer votre camera",
    },
    microphone: {
        disabled: "Votre micro est désactivé",
        activate: "Activer votre micro",
    },

    status: {
        ONLINE: "En ligne",
        AWAY: "Absent",
        BACK_IN_A_MOMENT: "De retour bientôt",
        DO_NOT_DISTURB: "Ne pas déranger",
        BUSY: "Occupé",
        SILENT: "Silencieux",
        JITSI: "En réunion",
        BBB: "En réunion",
        DENY_PROXIMITY_MEETING: "Non disponible",
        SPEAKER: "En réunion",
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
        },
        audioManagerNotAllowed: {
            title: "Sons ambiants bloqués",
        },
        follow: {
            title: "Demander à vous suivre",
            desc: "Vous pouvez demander à un utilisateur de vous suivre, et si cette demande est acceptée, son Woka vous suivra automatiquement, établissant ainsi une connexion fluide.",
        },
        lock: {
            title: "Vérouiller la bulle",
            desc: "En activant cette fonctionnalité, vous garantissez que personne ne pourra rejoindre la discussion. Vous êtes maître de votre espace, et seules les personnes déjà présentes peuvent interagir.",
        },
        mic: {
            title: "Activer/désactiver votre micro",
        },
        micDisabledByStatus: {
            title: "Micro désactivé",
        },
        cam: {
            title: "Activer/désactiver votre caméra",
        },
        camDisabledByStatus: {
            title: "Caméra désactivée",
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
        },
        calendar: {
            title: "Calendrier",
        },
        todolist: {
            title: "Liste de tâches",
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
};

export default actionbar;
