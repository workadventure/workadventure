import type { BaseTranslation } from "../i18n-types";

const mapEditor: BaseTranslation = {
    map: {
        refreshPrompt: "New version of map detected. Refresh needed",
    },
    sideBar: {
        areaEditor: "Area editor tool",
        entityEditor: "Entity editor tool",
        tileEditor: "Tile editor tool",
    },
    properties: {
        silentProperty: {
            label: "Silent",
            description: "Do not allow for conversations inside.",
        },
        textProperties: {
            label: "Header Text",
            placeholder: "Input here text which will be displayed when interacting with the object",
        },
        focusableProperties: {
            label: "Focusable",
            description: "Focus camera on this area on enter.",
            zoomMarginLabel: "Zoom Margin",
            defaultButtonLabel: "Focus on",
        },
        jitsiProperties: {
            label: "Jitsi Room",
            description: "Start Jitsi meeting on enter.",
            roomNameLabel: "Room Name",
            jitsiUrl: "Jitsi URL",
            jitsiUrlPlaceholder: "meet.jit.si",
            roomNamePlaceholder: "Room Name",
            defaultButtonLabel: "Open Jitsi Room",
            audioMutedLabel: "Muted by default",
            moreOptionsLabel: "More Options",
            trigger: "Interaction",
            triggerMessage: "Toast Message",
            triggerShowImmediately: "Show immediately on enter",
            triggerOnClick: "Start as minimized in bottom bar",
            triggerOnAction: "Show action toast with message",
            closable: "Can be closed",
            noPrefix: "No Jitsi room name prefix",
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
            description: "Play audio with adjustable volume.",
            volumeLabel: "Volume",
            audioLinkLabel: "Audio Link",
            audioLinkPlaceholder: "https://xxx.yyy/smthing.mp3",
            defaultButtonLabel: "Play music",
        },
        linkProperties: {
            label: "Open Link",
            description: "Open website within Workadventure or as a new tab.",
            linkLabel: "Link URL",
            newTabLabel: "Open in new tab",
            trigger: "Interaction",
            triggerMessage: "Toast Message",
            triggerShowImmediately: "Show immediately on enter",
            triggerOnClick: "Start as minimized in bottom bar",
            triggerOnAction: "Show action toast with message",
            closable: "Can be closed",
            allowAPI: "Allow API",
            linkPlaceholder: "https://example.com",
            defaultButtonLabel: "Open Link",
            width: "Width",
            policy: "iFrame Allow",
            policyPlaceholder: "fullscreen",
        },
    },
    areaEditor: {
        editInstructions: "Click an area to modify its properties.",
        nameLabel: "Name",
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
