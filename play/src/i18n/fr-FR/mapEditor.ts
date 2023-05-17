import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    sideBar: {
        areaEditor: "Outil d'édition de zone",
        entityEditor: "Outil d'édition d'entités",
        tileEditor: "Outil d'édition de tuiles",
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
        deleteButton: "Supprimer",
        testInteractionButton: "Tester interaction",
        buttonLabel: "Texte du bouton",
        editInstructions: "Sélectionnez un objet pour modifier ses propriétés.",
    },
};

export default mapEditor;
