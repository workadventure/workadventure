import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

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
            mobile: "Ouvrir le menu mobile",
            calendar: "Ouvrir le calendrier",
            todoList: "Ouvrir la liste de tâches",
        },
    },
    visitCard: {
        close: "Fermer",
        sendMessage: "Envoyer un message",
    },
    profile: {
        login: "S'identifier",
        logout: "Déconnexion",
        helpAndTips: "Aide et astuces",
    },
    settings: {
        videoBandwidth: {
            title: "Qualité vidéo",
            low: "Basse",
            recommended: "Recommandée",
            high: "High",
        },
        shareScreenBandwidth: {
            title: "Qualité du partage d'écran",
            low: "Basse",
            recommended: "Recommandée",
            high: "High",
        },
        bandwidthConstrainedPreference: {
            title: "Si la bande passante réseau est limitée",
            maintainFramerateTitle: "Conserver des animations fluides",
            maintainFramerateDescription:
                "Prioriser le nombre d'images par seconde plutôt que la résolution. À utiliser quand la fluidité est importante, par exemple pour le streaming de jeux vidéo.",
            maintainResolutionTitle: "Garder le texte lisible",
            maintainResolutionDescription:
                "Prioriser la résolution plutôt que le nombre d'images par seconde. À utiliser quand la lisibilité du texte est importante, comme en présentation ou lors du partage de code.",
            balancedTitle: "Équilibrer fluidité et résolution",
            balancedDescription: "Essayer de garder un équilibre entre fluidité et résolution.",
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
        enablePictureInPicture: "Activer le picture-in-picture",
        chatSounds: "Sons du chat",
        cowebsiteTrigger: "Demander toujours avant d'ouvrir des sites web et des salles de conférence Jitsi",
        ignoreFollowRequest: "Ignorer les demandes de suivi des autres utilisateurs",
        proximityDiscussionVolume: "Volume des bulles de discussion",
        blockAudio: "Désactiver bruits ambiants et musique",
        disableAnimations: "Désactiver les animations de la carte",
        bubbleSound: "Son des bulles",
        otherSettings: "Autres paramètres",
        bubbleSoundOptions: {
            ding: "Ding",
            wobble: "Wobble",
        },
        displayVideoQualityStats: "Afficher les statistiques de qualité vidéo",
    },
    invite: {
        description: "Partager le lien de la salle!",
        copy: "Copier",
        copied: "Copié",
        share: "Partager",
        walkAutomaticallyToPosition: "Marcher automatiquement jusqu'à ma position",
        selectEntryPoint: "Utiliser une autre zone de départ",
        selectEntryPointSelect: "Sélectionnez le point d'entrée par lequel les utilisateurs arriveront",
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
        dragAndDrop: "Glisser-déposer un fichier ici ou cliquer pour sélectionner un fichier 🎧",
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
    chat: {
        matrixIDLabel: "Votre ID Matrix",
        settings: "Paramètres",
        resetKeyStorageUpButtonLabel: "Réinitialiser la clé de sauvegarde",
        resetKeyStorageConfirmationModal: {
            title: "Confirmation de la réinitialisation de la clé de sauvegarde",
            content: "Vous êtes sur le point de réinitialiser la clé de sauvegarde. Êtes-vous sûr(e) ?",
            warning:
                "La réinitialisation de la clé de sauvegarde supprimera votre session actuelle et tous les utilisateurs de confiance. Vous pourriez perdre l'accès à certains messages passés et ne serez plus reconnu en tant qu'utilisateur de confiance. Assurez-vous de bien comprendre les conséquences de cette action avant de continuer.",
            cancel: "Annuler",
            continue: "Continuer",
        },
    },
    sub: {
        profile: "Profil",
        settings: "Paramètres",
        credit: "Crédits",
        globalMessages: "Messages globaux",
        contact: "Contact",
        report: "Remonter un bug",
        chat: "Chat",
        help: "Besoin d'aide ?",
        contextualActions: "Actions contextuelles",
        shortcuts: "Raccourcis",
    },
    shortcuts: {
        walkMyDesk: "Aller à mon bureau",
        title: "Raccourcis clavier",
        keys: "Raccourci",
        actions: "Action",
        moveUp: "Aller en haut",
        moveDown: "Aller en bas",
        moveLeft: "Aller à gauche",
        moveRight: "Aller à droite",
        speedUp: "Courir",
        interact: "Interagir",
        openChat: "Ouvrir le chat",
        openUserList: "Ouvrir la liste des utilisateurs",
        toggleMapEditor: "Afficher/Cacher l'éditeur de carte",
        rotatePlayer: "Faire pivoter le joueur",
        follow: "Suivre",
        emote1: "Émoticône 1",
        emote2: "Émoticône 2",
        emote3: "Émoticône 3",
        emote4: "Émoticône 4",
        emote5: "Émoticône 5",
        emote6: "Émoticône 6",
        openSayPopup: "Ouvrir la popup en mode dire",
        openThinkPopup: "Ouvrir la popup en mode pense",
    },
};

export default menu;
