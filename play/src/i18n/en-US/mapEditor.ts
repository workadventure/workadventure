import type { BaseTranslation } from "../i18n-types";

const mapEditor: BaseTranslation = {
    sideBar:{
        zoomIn:"Zoom in",
        zoomOut:"Zoom out",
        areaEditor:"Area editor tool",
        entityEditor:"Entity editor tool",
        tileEditor:"Tile editor tool"
    },
    entityEditor:{
        itemPicker:{
            searchPlaceholder:"Search for name or tags",
            selectVariationInstructions:"Select a variant"
        },
        addButton:"Add",
        editButton:"Edit",
        deleteButton:"Delete",
        testInteractionButton:"Test Interaction",
        buttonLabel:"Button Label",
        editInstructions:"Click an object to modify its properties.",
        removeInstructions:"Click an object to delete it.",
        jitsiProperties:{
            label:"Jitsi Room",
            roomNameLabel:"Room Name",
            roomNamePlaceholder:"Room Name",
            defaultButtonLabel :"Open Jitsi Room",
            audioMutedLabel :"Muted by default",
            moreOptionsLabel:"More Options",
            jitsiRoomConfig:{
                startWithAudioMuted:"Start with microphone muted",
                startWithVideoMuted:"Start with video closed"
            }
        },
        audioProperties:{
            label:"Play Audio File",
            audioLinkLabel:"Audio Link",
            audioLinkPlaceholder:"https://xxx.yyy/smthing.mp3",
            defaultButtonLabel :"Play music",
        },
        linkProperties:{
            label:"Open Link",
            linkLabel:"Link URL",
            newTabLabel:"Open in new tab",
            linkPlaceholder:"https://play.staging.workadventu.re/",
            defaultButtonLabel :"Open Link",
        }
    }
};

export default mapEditor;
