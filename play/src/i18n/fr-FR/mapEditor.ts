import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    sideBar: {
        areaEditor: "Outil d'édition de zone",
        entityEditor: "Outil d'édition d'entités",
        tileEditor: "Outil d'édition de tuiles",
        configureMyRoom: "Configurer la salle",
        trashEditor: "Corbeille",
    },
    properties: {
        textProperties: {
            label: "Texte d'Entête",
            placeholder: "Entrez ici le texte qui sera affiché lorsque l'on interagit avec l'objet.",
        },
        jitsiProperties: {
            label: "Salle Jitsi",
            roomNameLabel: "Nom de Salle",
            roomNamePlaceholder: "Nom de la Salle",
            defaultButtonLabel: "Ouvrir la salle Jitsi",
            audioMutedLabel: "Sourdine par défaut",
            moreOptionsLabel: "Plus d'options",
            jitsiRoomConfig: {
                addConfig: "Ajouter une option",
                startWithAudioMuted: "Démarrer avec le microphone coupé",
                startWithVideoMuted: "Démarrer avec la vidéo coupée",
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
    },
    entityEditor: {
        itemPicker: {
            searchPlaceholder: "Rechercher",
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
