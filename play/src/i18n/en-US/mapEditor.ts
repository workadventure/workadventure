import type { BaseTranslation } from "../i18n-types";

const mapEditor: BaseTranslation = {
    map: {
        refreshPrompt: "New version of map detected. Refresh needed",
    },
    sideBar: {
        areaEditor: "Area editor tool",
        entityEditor: "Entity editor tool",
        tileEditor: "Tile editor tool",
        configureMyRoom: "Configure my room",
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
            linkPlaceholder: "https://example.com",
            defaultButtonLabel: "Open Link",
        },
    },
    areaEditor: {
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
    settings: {
        loading: "Loading",
        megaphone: {
            title: "Megaphone",
            description:
                "The megaphone is a tool that allows you to broadcast a video/audio stream to all players in the room/world.",
            inputs: {
                spaceName: "Space name",
                spaceNameHelper:
                    "If you want to broadcast a stream to all the users that are on different rooms but in the same world, you must set the same SpaceName for all the megaphone settings in each room and set the scope to 'World'.",
                scope: "Scope",
                world: "World",
                room: "Room",
                rights: "Rights",
                rightsHelper:
                    "The rights define who can use the megaphone. If you leave it empty, anyone can use it. If you set it, only users that have one of those 'tag' can use it.",
                error: {
                    title: "Please enter a title",
                    save: {
                        success: "Megaphone settings saved",
                        fail: "Error while saving megaphone settings",
                    }
                },
            },
        },
    },
};

export default mapEditor;
