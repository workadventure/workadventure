import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "Menu",
    icon: {
        open: {
            menu: "Ouvrir le menu",
            invite: "Afficher l'invitation",
            register: "Enregistrez-vous",
            chat: "Ouvrir le chat",
            userlist: "Liste des utilisateurs",
            openEmoji: "Ouvrir la sélection d'emoji",
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
            high: "Haute",
        },
        shareScreenBandwidth: {
            title: "Qualité du partage d'écran",
            low: "Basse",
            recommended: "Recommandée",
            high: "Haute",
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
        microphone: {
            title: "Réglages du microphone",
            autoGainControl: "Contrôle automatique du gain",
            autoGainControlDescription: "Ajuste automatiquement le volume de votre microphone.",
            echoCancellation: "Annulation de l'écho",
            enableAdvancedNoiseReduction: "Activer la réduction avancée du bruit",
            noiseSuppressionMode: "Mode de réduction du bruit :",
            workAdventureNoiseSuppression: "Réduction du bruit WorkAdventure",
            workAdventureNoiseSuppressionDescription:
                "Traite votre microphone avec la réduction du bruit de WorkAdventure.",
            recommended: "Recommandé",
            browserNoiseSuppression: "Réduction du bruit du navigateur",
            browserNoiseSuppressionDescription: "Utilise la réduction du bruit intégrée à votre navigateur.",
            voiceIsolation: "Isolation de la voix",
            voiceIsolationDescription:
                "Utilise l'isolation de la voix du navigateur et du système d'exploitation lorsqu'elle est disponible.",
            noiseSuppressionEngine: "Moteur de réduction du bruit",
            noiseSuppressionEngineDeepFilterNet: "DeepFilterNet (nouveau, voix pleine bande)",
            noiseSuppressionEngineDtln: "DTLN (ancien moteur)",
        },
        language: {
            title: "Langue",
        },
        privacySettings: {
            title: "Mode absent",
            explanation:
                'Quand vous passez à une autre fenêtre ou à un autre onglet, WorkAdventure passe en "mode absent", sauf pendant une conversation ou une diffusion.',
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
        description: "Partager le lien de la salle !",
        copy: "Copier",
        copied: "Copié",
        share: "Partager",
        walkAutomaticallyToPosition: "Marcher automatiquement jusqu'à ma position",
        selectEntryPoint: "Utiliser une autre zone de départ",
        selectEntryPointSelect: "Sélectionnez le point d'entrée par lequel les utilisateurs arriveront",
    },
    globalMessage: {
        warning: "Diffusion dans toutes les salles du monde",
        enter: "Entrez votre message ici...",
        send: "Envoyer",
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
                empty: "Le créateur de la carte n'a pas déclaré de droit d'auteur pour les fichiers audio. Cela ne signifie pas que les fichiers audio n'ont pas de licence.",
            },
        },
    },
    chat: {
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
        contact: "Contact",
        report: "Remonter un bug",
        help: "Besoin d'aide ?",
        contextualActions: "Actions contextuelles",
        shortcuts: "Raccourcis",
    },
    shortcuts: {
        walkMyDesk: "Aller à mon bureau",
        edit: {
            start: "Modifier",
            title: "Mode édition",
            help: "Cliquez sur un raccourci puis appuyez sur la nouvelle combinaison. Échap annule. Vos choix sont enregistrés dans ce navigateur.",
            resetAll: "Tout réinitialiser",
            done: "Terminer",
            pressKey: "Appuyez sur une touche…",
            none: "Aucun",
            change: "Changer le raccourci de « {action} »",
            reset: "Rétablir le raccourci par défaut de « {action} »",
            locked: "Non modifiable",
            modified: "Modifié",
            usedBy: "{keys} est déjà utilisé par « {action} ». Le remplacer laissera « {action} » sans raccourci.",
            usedByFixed: "{keys} est déjà utilisé par « {action} », qui ne peut pas être modifié.",
            reserved: "{keys} est réservé par le navigateur. Choisissez une autre touche.",
            replace: "Remplacer",
            cancel: "Annuler",
        },
        subtitle: "Ils sont désactivés pendant que vous écrivez dans un champ de texte.",
        searchLabel: "Rechercher un raccourci",
        searchPlaceholder: "Rechercher une action ou une touche…",
        noResult: "Aucun raccourci ne correspond à « {query} ».",
        or: "ou",
        layout: "Disposition du clavier",
        walk: "Marcher",
        sendEmote: "Envoyer une émoticône",
        groups: {
            move: "Se déplacer",
            communicate: "Communiquer",
            express: "S'exprimer",
            interact: "Interagir",
        },
        hints: {
            speedUp: "Maintenir pendant le déplacement",
            follow: "Près d'une personne",
            emotes: "Dans l'ordre de la barre d'émoticônes",
            mapEditor: "Si vous pouvez modifier la carte",
        },
        keyNames: {
            shift: "Maj",
            enter: "Entrée",
            space: "Espace",
        },
        title: "Raccourcis clavier",
        speedUp: "Courir",
        interact: "Interagir",
        openChat: "Ouvrir le chat",
        openUserList: "Ouvrir la liste des utilisateurs",
        toggleMapEditor: "Afficher/Cacher l'éditeur de carte",
        rotatePlayer: "Faire pivoter le joueur",
        follow: "Suivre",
        openSayPopup: "Ouvrir la popup en mode dire",
        openThinkPopup: "Ouvrir la popup en mode pense",
    },
};

export default menu;
