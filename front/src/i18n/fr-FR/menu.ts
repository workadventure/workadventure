import type { Translation } from "../i18n-types";

const menu: NonNullable<Translation["menu"]> = {
    title: "Menu",
    icon: {
        open: {
            menu: "Ouvrir le menu",
            invite: "Afficher l'invitation",
            register: "Enregistrez vous",
            chat: "Ouvrir le chat",
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
        gameQuality: {
            title: "Qualité du jeu",
            short: {
                high: "Haute (120 fps)",
                medium: "Moyenne (60 fps)",
                small: "Reduite (40 fps)",
                minimum: "Minimale (20 fps)",
            },
            long: {
                high: "Haute (120 fps)",
                medium: "Moyenne (60 fps, recommandée)",
                small: "Reduite (40 fps)",
                minimum: "Minimale (20 fps)",
            },
        },
        videoQuality: {
            title: "Qualité de la vidéo",
            short: {
                high: "Haute (30 fps)",
                medium: "Moyenne (20 fps)",
                small: "Reduite (10 fps)",
                minimum: "Minimale (5 fps)",
            },
            long: {
                high: "Haute (30 fps)",
                medium: "Moyenne (20 fps, recommandée)",
                small: "Reduite (10 fps)",
                minimum: "Minimale (5 fps)",
            },
        },
        language: {
            title: "Langage",
        },
        save: {
            warning: "(La sauvegarde de ces paramètres redémarre le jeu)",
            button: "Sauvegarder",
        },
        fullscreen: "Plein écran",
        notifications: "Notifications",
        cowebsiteTrigger: "Demander toujours avant d'ouvrir des sites web et des salles de réunion Jitsi",
        ignoreFollowRequest: "Ignorer les demandes de suivi des autres utilisateurs",
    },
    invite: {
        description: "Partager le lien de la salle!",
        copy: "Copier",
        share: "Partager",
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
        profile: "Profile",
        settings: "Paramètres",
        invite: "Inviter",
        credit: "Crédits",
        globalMessages: "Messages globaux",
        contact: "Contact",
    },
};

export default menu;
