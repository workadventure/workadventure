import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "Menu",
    icon: {
        open: {
            menu: "Ouvrir le menu",
            invite: "Afficher l'invitation",
            register: "Enregistrez vous",
            chat: "Ouvrir le chat",
            userlist: "Liste des utilisateurs",
            openEmoji: "Ouvrir la selection d'emoji",
            closeEmoji: "Fermer le menu emoji",
        },
    },
    visitCard: {
        close: "Fermer",
    },
    profile: {
        edit: {
            name: "Modifier votre nom",
            woka: "Modifier votre WOKA",
            companion: "Modifier votre compagnon",
            camera: "Modifier votre caméra",
        },
        login: "S'identifier",
        logout: "Déconnexion",
    },
    settings: {
        videoBandwidth: {
            title: "Qualité vidéo",
            low: "Basse",
            recommended: "Recommandée",
            unlimited: "Illimitée",
        },
        shareScreenBandwidth: {
            title: "Qualité du partage d'écran",
            low: "Basse",
            recommended: "Recommandée",
            unlimited: "Illimitée",
        },
        language: {
            title: "Langage",
        },
        privacySettings: {
            title: "Mode absent",
            explanation:
                "Quand l'onglet WorkAdventure de votre navigateur n'est pas visible, WorkAdventure passe en \"mode absent\"",
            cameraToggle: 'Garder la caméra activée en "mode absent"',
            microphoneToggle: 'Garder le microphone activé en "mode absent"',
        },
        save: "Sauvegarder",
        fullscreen: "Plein écran",
        notifications: "Notifications",
        chatSounds: "Sons du chat",
        cowebsiteTrigger: "Demander toujours avant d'ouvrir des sites web et des salles de conférence Jitsi",
        ignoreFollowRequest: "Ignorer les demandes de suivi des autres utilisateurs",
    },
    invite: {
        description: "Partager le lien de la salle!",
        copy: "Copier",
        share: "Partager",
        walkAutomaticallyToPosition: "Marcher automatiquement jusqu'à ma position",
        selectEntryPoint: "Selectionner la zone de départ",
    },
    globalMessage: {
        text: "Texte",
        audio: "Audio",
        warning: "Diffusion dans toutes les salles du monde",
        enter: "Entrez votre message ici...",
        send: "Envoyer",
    },
    globalAudio: {
        uploadInfo: "Télécharger un fichier",
        error: "Aucun fichier sélectionné. Vous devez télécharger un fichier avant de l'envoyer.",
        errorUpload:
            "Erreur lors de l'envoi du fichier. Veuillez vérifier votre fichier et réessayer. Si le problème persiste, contacter l'administrateur.",
    },
    contact: {
        gettingStarted: {
            title: "Pour commencer",
            description:
                "WorkAdventure vous permet de créer un espace en ligne pour communiquer spontanément avec d'autres personnes. Et tout commence par la création de votre propre espace. Choisissez parmi une large sélection de cartes préfabriquées par notre équipe.",
        },
        createMap: {
            title: "Créer votre carte",
            description: "Vous pouvez également créer votre propre carte personnalisée en suivant la documentation.",
        },
    },
    about: {
        mapInfo: "Informations sur la carte",
        mapLink: "lien vers cette carte",
        copyrights: {
            map: {
                title: "Droits d'auteur de la carte",
                empty: "Le créateur de la carte n'a pas déclaré de droit d'auteur pour la carte.",
            },
            tileset: {
                title: "Droits d'auteur des tilesets",
                empty: "Le créateur de la carte n'a pas déclaré de droit d'auteur pour les tilesets. Cela ne signifie pas que les tilesets n'ont pas de licence.",
            },
            audio: {
                title: "Droits d'auteur des fichiers audio",
                empty: "aré de droit d'auteur pour les fichiers audio. Cela ne signifie pas que les fichiers audio n'ont pas de licence.",
            },
        },
    },
    sub: {
        profile: "Profil",
        settings: "Paramètres",
        invite: "Inviter",
        credit: "Crédits",
        globalMessages: "Messages globaux",
        contact: "Contact",
        report: "Remonter un bug",
    },
};

export default menu;
