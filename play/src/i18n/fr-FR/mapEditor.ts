import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    map: {
        refreshPrompt: "Nouvelle version de la carte détectée. Actualisation nécessaire",
    },
    sideBar: {
        areaEditor: "Outil d'édition de zone",
        entityEditor: "Outil d'édition d'entités",
        tileEditor: "Outil d'édition de tuiles",
        configureMyRoom: "Configurer la salle",
        trashEditor: "Corbeille",
    },
    properties: {
        silentProperty: {
            label: "Silent",
            description: "Ne permet pas les conversations à l'intérieur.",
        },
        textProperties: {
            label: "Texte d'en-tête",
            placeholder: "Saisissez ici le texte qui sera affiché lors de l'interaction avec l'objet",
        },
        focusableProperties: {
            label: "Focalisable",
            description: "Focaliser sur cette zone à l'entrée.",
            zoomMarginLabel: "Marge de Zoom",
            defaultButtonLabel: "Focaliser sur",
        },
        jitsiProperties: {
            label: "Salle Jitsi",
            description: "Démarrer une réunion Jitsi à l'entrée.",
            jitsiUrl: "URL Jitsi",
            jitsiUrlPlaceholder: "meet.jit.si",
            roomNameLabel: "Nom de Salle",
            roomNamePlaceholder: "Nom de la Salle",
            defaultButtonLabel: "Ouvrir la salle Jitsi",
            audioMutedLabel: "Désactivé par défaut",
            moreOptionsLabel: "Plus d'options",
            trigger: "Interaction d'ouverture",
            triggerMessage: "Message d'information",
            triggerShowImmediately: "Afficher immédiatement à l'entrée",
            triggerOnClick: "Démarrer en mode réduit dans la barre inférieure",
            triggerOnAction: "Afficher un message d'information avec le message",
            closable: "Peut être fermé",
            noPrefix: "Peut être ouvert dans d'autres salons",
            width: "Largeur",
            jitsiRoomConfig: {
                addConfig: "Ajouter une option",
                startWithAudioMuted: "Démarrer avec le microphone désactivé",
                startWithVideoMuted: "Démarrer avec la vidéo désactivée",
                cancel: "Annuler",
                validate: "Valider",
            },
        },
        audioProperties: {
            label: "Jouer un fichier audio",
            description: "Jouer un audio avec un volume réglable.",
            audioLinkLabel: "Lien vers l'audio",
            audioLinkPlaceholder: "https://xxx.yyy/smthing.mp3",
            defaultButtonLabel: "Jouer de la musique",
            volumeLabel: "Volume",
            error: "Impossible de charger le son",
        },
        linkProperties: {
            label: "Ouvrir un lien",
            description: "Ouvrir un site web dans l'application ou dans un nouvel onglet.",
            linkLabel: "URL du Lien",
            trigger: "Interaction",
            triggerMessage: "Message d'information",
            triggerShowImmediately: "Afficher immédiatement à l'entrée",
            triggerOnClick: "Démarrer en mode réduit dans la barre inférieure",
            triggerOnAction: "Afficher un message d'information avec le message",
            closable: "Peut être fermé",
            allowAPI: "Autoriser la Scripting API",
            newTabLabel: "Ouvrir dans un nouvel onglet",
            linkPlaceholder: "https://example.com",
            defaultButtonLabel: "Ouvrir le lien",
            width: "Largeur",
            policy: "iFrame Autorisé",
            policyPlaceholder: "fullscreen",
            errorEmbeddableLink: "Le lien ne peut pas être intégré",
            messageNotEmbeddableLink:
                "Le lien ne peut pas être intégré. Il peut uniquement s'ouvrir dans un nouvel onglet.",
            warningEmbeddableLink: "Ce lien ne peut pas être intégré.",
            errorInvalidUrl: 'Veuillez entrer une URL valide (commençant par "https://")',
            findOutMoreHere: "En savoir plus ici",
        },
        advancedOptions: "Options avancées",
        speakerMegaphoneProperties: {
            label: "Zone conférencier",
            description: "",
            nameLabel: "Nom de la zone de diffusion",
            namePlaceholder: "MaZoneDeDiffusion",
        },
        listenerMegaphoneProperties: {
            label: "Zone participant",
            description: "",
            nameLabel: "Nom de la zone de diffusion",
            namePlaceholder: "MaZoneDeDiffusion",
        },
        chatEnabled: "Chat activé",
        startProperties: {
            label: "Zone de départ",
            description: "Où les joueurs apparaissent lorsqu'ils entrent dans la carte.",
            nameLabel: "Nom de la zone de départ",
            namePlaceholder: "MaZoneDeDépart",
        },
        exitProperties: {
            label: "Zone de sortie",
            description: "Où les joueurs apparaissent lorsqu'ils quittent la carte.",
            exitMap: "Quitter la carte",
            exitMapStartAreaName: "Nom de la zone de départ",
        },
    },
    areaEditor: {
        editInstructions: "Sélectionnez une zone pour modifier ses propriétés.",
        nameLabel: "Nom de la zone",
    },
    entityEditor: {
        itemPicker: {
            searchPlaceholder: "Rechercher",
            backToSelectObject: "Retour à la sélection d'objet",
        },
        trashTool: {
            delete: "Supprimer un item en cliquant dessus !",
        },
        deleteButton: "Supprimer",
        testInteractionButton: "Tester interaction",
        buttonLabel: "Texte du bouton",
        editInstructions: "Sélectionnez un objet pour modifier ses propriétés.",
        selectObject: "Cliquer sur un objet pour le selectionner",
    },
    settings: {
        loading: "Chargement en cours",
        megaphone: {
            title: "Megaphone",
            description:
                "Le megaphone est un outil qui permet de diffuser un flux vidéo/audio à tous les joueurs dans la salle/monde.",
            inputs: {
                spaceName: "Nom de l'espace",
                spaceNameHelper:
                    "Si vous souhaitez diffuser un flux à tous les utilisateurs qui se trouvent dans différentes salles mais dans le même monde, vous devez définir le même nom d'espace pour tous les paramètres du megaphone dans chaque salle et définir la portée sur 'Monde'.",
                scope: "Portée",
                world: "Monde",
                room: "Salle",
                rights: "Droits",
                rightsHelper:
                    "Les droits définissent qui peut utiliser le megaphone. Si vous le laissez vide, tout le monde peut l'utiliser. Si vous le définissez, seuls les utilisateurs qui ont au moins l'un de ces 'tags' peuvent l'utiliser.",
                error: {
                    title: "Veuillez entrer un nom",
                    save: {
                        success: "Paramètres enregstrés avec succès",
                        fail: "Une erreur est survenue lors de l'enregistrement des paramètres",
                    },
                },
            },
        },
    },
};

export default mapEditor;
