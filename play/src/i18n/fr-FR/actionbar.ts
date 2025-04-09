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
    otherSettings: "Autres paramètres",
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
        },
        users: {
            title: "Afficher la liste des utilisateurs",
        },
        emoji: {
            title: "Réagir avec un emoji",
        },
        audioManager: {
            title: "Volume des sons ambiants",
        },
        audioManagerNotAllowed: {
            title: "Sons ambiants bloqués",
        },
        follow: {
            title: "Demander à vous suivre",
        },
        lock: {
            title: "Vérouiller la bulle",
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
        },
        unfollow: {
            title: "Arrêter de suivre",
        },
        apps: {
            title: "Applications tierces",
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
