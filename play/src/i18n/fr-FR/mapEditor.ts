import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    sideBar:{
        zoomIn:"Zoom",
        zoomOut:"Dézoom",
        areaEditor:"Outil d'édition de zone",
        entityEditor:"Outil d'édition d'entités",
        tileEditor:"Outil d'édition de tuiles"
    },
    entityEditor:{
        itemPicker:{
            searchPlaceholder:"Rechercher nom ou tag",
            selectVariationInstructions:"Sélectionnez une variation"
        },
        addButton:"Ajouter",
        editButton:"Éditer",
        deleteButton:"Supprimer",
        testInteractionButton:"Tester interaction",
        buttonLabel:"Texte du bouton",
        editInstructions:"Sélectionnez un objet pour modifier ses propriétés.",
        removeInstructions:"Cliquez sur un objet pour le supprimer.",
        textProperties:{
            label:"Texte d'Entête",
            placeholder:"Entrez ici le texte qui sera affiché lorsque l'on interagit avec l'objet."
        },
        jitsiProperties:{
            label:"Salle Jitsi",
            roomNameLabel:"Nom de Salle",
            roomNamePlaceholder:"Nom de la Salle",
            defaultButtonLabel :"Ouvrir la salle Jitsi",
            audioMutedLabel :"Sourdine par défaut",
            moreOptionsLabel:"Plus d'options",
            jitsiRoomConfig:{
                startWithAudioMuted:"Démarrer avec le microphone coupé",
                startWithVideoMuted:"Démarrer avec la vidéo coupée"
            }
        },
        audioProperties:{
            label:"Jouer un fichier audio",
            audioLinkLabel:"Lien vers l'audio",
            audioLinkPlaceholder:"https://xxx.yyy/qqchose.mp3",
            defaultButtonLabel :"Jouer de la musique",
        },
        linkProperties:{
            label:"Ouvrir un lien",
            linkLabel:"URL du Lien",
            newTabLabel:"Ouvrir dans un nouvel onglet",
            linkPlaceholder:"https://play.staging.workadventu.re/",
            defaultButtonLabel :"Ouvrir le lien",
        }
    }
};

export default mapEditor;
