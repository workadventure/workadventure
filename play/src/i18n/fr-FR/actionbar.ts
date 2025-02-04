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
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        users: {
            title: "Afficher la liste des utilisateurs",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        emoji: {
            title: "Réagir avec un emoji",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        audioManager: {
            title: "Volume des sons ambiants",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        audioManagerNotAllowed: {
            title: "Sons ambiants bloqués",
            desc: "Votre navigateur a empêché les sons ambiants de jouer. Cliquez sur l'icône pour commencer à jouer des sons.",
        },
        follow: {
            title: "Demander à vous suivre",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        lock: {
            title: "Vérouiller la bulle",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        mic: {
            title: "Activer/désactiver votre micro",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        micDisabledByStatus: {
            title: "Micro désactivé",
            desc: 'Votre micro est désactivé car vous êtes en mode "{status}".',
        },
        cam: {
            title: "Activer/désactiver votre caméra",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        camDisabledByStatus: {
            title: "Caméra désactivée",
            desc: 'Votre caméra est désactivée car vous êtes en mode "{status}".',
        },
        share: {
            title: "Partager votre écran",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
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
