import type { BaseTranslation } from "../i18n-types";

const mapEditor: BaseTranslation = {
    sideBar: {
        zoomIn: "Zoom in",
        zoomOut: "Zoom out",
        areaEditor: "Area editor tool",
        entityEditor: "Entity editor tool",
        tileEditor: "Tile editor tool",
    },
    properties: {
        textProperties: {
            label: "Header Text",
            placeholder: "Input here text which will be displayed when interacting with the object",
        },
        focusableProperties: {
            label: "Focusable",
            zoomMarginLabel: "Zoom Margin",
            defaultButtonLabel: "Focus on",
        },
        jitsiProperties: {
            label: "Jitsi Room",
            roomNameLabel: "Room Name",
            roomNamePlaceholder: "Room Name",
            defaultButtonLabel: "Open Jitsi Room",
            audioMutedLabel: "Muted by default",
            moreOptionsLabel: "More Options",
            jitsiRoomConfig: {
                addConfig: "Add an option",
                startWithAudioMuted: "Start with microphone muted",
                startWithVideoMuted: "Start with video closed",
                cancel: "Cancel",
                validate: "Validate",
            },
        },
        audioProperties: {
            label: "Play Audio File",
            audioLinkLabel: "Audio Link",
            audioLinkPlaceholder: "https://xxx.yyy/smthing.mp3",
            defaultButtonLabel: "Play music",
        },
        linkProperties: {
            label: "Open Link",
            linkLabel: "Link URL",
            newTabLabel: "Open in new tab",
            linkPlaceholder: "https://play.staging.workadventu.re/",
            defaultButtonLabel: "Open Link",
        },
    },
    entityEditor: {
        itemPicker: {
            searchPlaceholder: "Search for name or tags",
            selectVariationInstructions: "Select a variant",
        },
        deleteButton: "Delete",
        testInteractionButton: "Test Interaction",
        buttonLabel: "Button Label",
        editInstructions: "Click an entity to modify its properties.",
    },
};

export default mapEditor;
