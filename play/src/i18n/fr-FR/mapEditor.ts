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
            label: "Focusable",
            description: "Focus de la caméra sur cette zone à l'entrée.",
            zoomMarginLabel: "Marge de zoom",
            defaultButtonLabel: "Focus sur",
        },
        jitsiProperties: {
            label: "Salle Jitsi",
            description: "Démarrer une réunion Jitsi lors de l'entrée dans la zone.",
            roomNameLabel: "Nom de la salle",
            jitsiUrl: "Jitsi URL",
            jitsiUrlPlaceholder: "meet.jit.si",
            roomNamePlaceholder: "Nom de la salle",
            defaultButtonLabel: "Ouvrir la salle Jitsi",
            audioMutedLabel: "Désactivé par défaut",
            moreOptionsLabel: "Plus d'options",
            trigger: "Interaction",
            triggerMessage: "Message de notification",
            triggerShowImmediately: "Afficher immédiatement à l'entrée",
            triggerOnClick: "Démarrer en mode réduit dans la barre inférieure",
            triggerOnAction: "Afficher une notification avec le message",
            closable: "Peut être fermé",
            noPrefix: "Pas de préfixe de nom de salle Jitsi",
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
            audioLinkLabel: "Lien vers l'audio",
            audioLinkPlaceholder: "https://xxx.yyy/smthing.mp3",
            defaultButtonLabel: "Jouer de la musique",
        },
        linkProperties: {
            label: "Ouvrir un lien",
            linkLabel: "URL du Lien",
            newTabLabel: "Ouvrir dans un nouvel onglet",
            linkPlaceholder: "https://example.com",
            defaultButtonLabel: "Ouvrir le lien",
            errorEmbeddableLink: "Le lien ne peut pas être intégré",
        },
        advancedOptions: "Options avancées",
        speakerMegaphoneProperties: {
            label: "Zone de diffusion pour haut-parleur",
            description: "",
            nameLabel: "Nom de la zone",
            namePlaceholder: "MaZoneDeDiffusion",
        },
        listenerMegaphoneProperties: {
            label: "Zone d'écoute pour haut-parleur",
            description: "",
            nameLabel: "Nom de la zone",
            namePlaceholder: "MaZoneDecoute",
        },
        chatEnabled: "Associate a dedicated chat channel",
        startProperties: {
            label: "Zone de départ",
            description: "Où les joueurs apparaissent lorsqu'ils entrent dans la carte.",
            nameLabel: "Nom de la zone",
            namePlaceholder: "Nom de la zone de départ",
        },
        exitProperties: {
            label: "Zone de sortie",
            description: "Où les joueurs apparaissent lorsqu'ils quittent la carte.",
            exitMap: "Quitter la carte",
            exitMapStartAreaName: "Nom de la zone de départ",
        },
        youtubeProperties: {
            label: "Ouvrir le lien Youtube",
            description: "Ouvrir Youtube dans WorkAdventure ou dans un nouvel onglet.",
            error: "Veuillez entrer une URL Youtube valide",
            disabled: "L'intégration Youtube est désactivée. ",
        },
        googleDocsProperties: {
            label: "Ouvrir le lien Google Docs",
            description: "Ouvrir Google Docs dans WorkAdventure ou dans un nouvel onglet.",
            error: "Veuillez entrer une URL Google Docs valide",
            disabled: "L'intégration Google Docs est désactivée.",
        },
        klaxoonProperties: {
            label: "Ouvrir le lien Klaxoon",
            description: "Ouvrir Klaxoon dans WorkAdventure ou dans un nouvel onglet.",
            error: "Veuillez entrer une URL Klaxoon valide",
            disabled: "L'intégration Klaxoon est désactivée.",
        },
        googleSheetsProperties: {
            label: "Ouvrir le lien Google Sheets",
            description: "Ouvrir Google Sheets dans WorkAdventure ou dans un nouvel onglet.",
            error: "Veuillez entrer une URL Google Sheets valide",
            disabled: "L'intégration Google Sheets est désactivée.",
        },
        googleSlidesProperties: {
            label: "Ouvrir le lien Google Slides",
            description: "Ouvrir Google Slides dans WorkAdventure ou dans un nouvel onglet.",
            error: "Veuillez entrer une URL Google Slides valide",
            disabled: "L'intégration Google Slides est désactivée.",
        },
        eraserProperties: {
            label: "Eraser",
            description: "Ouvrir Eraser dans WorkAdventure ou dans un nouvel onglet.",
            defaultButtonLabel: "Erase",
            error: "Veuillez entrer une URL Eraser valide",
            disabled: "L'intégration Eraser est désactivée.",
        },
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
