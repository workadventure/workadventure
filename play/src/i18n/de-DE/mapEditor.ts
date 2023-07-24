import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    sideBar: {
        areaEditor: "Fläche bearbeiten",
        entityEditor: "Entität bearbeiten",
        tileEditor: "Kachel bearbeiten",
        trashEditor: "Papierkorb",
    },
    properties: {
        jitsiProperties: {
            label: "Jitsi-Raum",
            roomNameLabel: "Room Name",
            roomNamePlaceholder: "Room Name",
            defaultButtonLabel: "Jitsi-Raum öffnen",
            audioMutedLabel: "Standartmäßig stummgeschaltet",
            moreOptionsLabel: "Mehr Optionen",
            jitsiRoomConfig: {
                addConfig: "Option hinzufügen",
                startWithAudioMuted: "Mit deaktiviertem Mikrofon starten",
                startWithVideoMuted: "Mit deaktivierter Kamera starten",
                cancel: "Abbrechen",
                validate: "Validieren",
            },
        },
        audioProperties: {
            label: "Audiodatei abspielen",
            audioLinkLabel: "Audiolink",
            audioLinkPlaceholder: "https://xxx.yyy/smthing.mp3",
            defaultButtonLabel: "Musik abspielen",
        },
        linkProperties: {
            label: "Link öffnen",
            linkLabel: "Link URL",
            newTabLabel: "In neuen Tab öffnen",
            linkPlaceholder: "https://example.com",
            defaultButtonLabel: "Link öffnen",
            errorEmbeddableLink: "Der Link ist nicht einbettbar",
        },
        advancedOptions: "Erweiterte Optionen",
        youtubeProperties: {
            label: "Youtube-Video öffnen",
            description: "Öffnen Sie Youtube-Videos innerhalb von WorkAdventure oder als neuen Tab.",
            error: "Bitte geben Sie eine gültige Youtube-URL ein",
            disabled: "Die Youtube-Integration ist deaktiviert.",
        },
        googleDocsProperties: {
            label: "Google Docs öffnen",
            description: "Öffnen Sie Google Docs innerhalb von WorkAdventure oder als neuen Tab.",
            error: "Bitte geben Sie eine gültige Google Docs-URL ein",
            disabled: "Die Google Docs-Integration ist deaktiviert.",
        },
        klaxoonProperties: {
            label: "Klaxoon öffnen",
            description: "Öffnen Sie Klaxoon innerhalb von WorkAdventure oder als neuen Tab.",
            error: "Bitte geben Sie eine gültige Klaxoon-URL ein",
            disabled: "Die Klaxoon-Integration ist deaktiviert.",
        },
        googleSheetsProperties: {
            label: "Google Sheets öffnen",
            description: "Öffnen Sie Google Sheets innerhalb von WorkAdventure oder als neuen Tab.",
            error: "Bitte geben Sie eine gültige Google Sheets-URL ein",
            disabled: "Die Google Sheets-Integration ist deaktiviert.",
        },
        googleSlidesProperties: {
            label: "Google Slides öffnen",
            description: "Öffnen Sie Google Slides innerhalb von WorkAdventure oder als neuen Tab.",
            error: "Bitte geben Sie eine gültige Google Slides-URL ein",
            disabled: "Die Google Slides-Integration ist deaktiviert.",
        },
    },
    entityEditor: {
        itemPicker: {
            searchPlaceholder: "Forschen",
        },
        trashTool: {
            delete: "Klicken Sie auf das Objekt, um es zu löschen!",
        },
        deleteButton: "Löschen",
        testInteractionButton: "Interaktion testen",
        buttonLabel: "Knopfbeschrifung",
        editInstructions: "Klicken Sie auf ein Objekt, um seine Eigenschaften zu ändern.",
        selectObject: "Klicken Sie auf ein Objekt, um es auszuwählen",
    },
    settings: {
        loading: "Laden...",
        megaphone: {
            title: "Megaphon",
            description:
                "Das Megaphon ist ein Werkzeug, mit dem Sie Ihre Stimme über die ganze Welt oder einen Raum hinweg übertragen können.",
            inputs: {
                spaceName: "Raumname",
                spaceNameHelper:
                    "Der Name des Raums, in dem das Megaphon verwendet werden kann. Wenn Sie es leer lassen, kann es in der gesamten Welt verwendet werden.",
                scope: "Geltungsbereich",
                world: "Welt",
                room: "Raum",
                rights: "Rechte",
                rightsHelper:
                    "Die Rechte, die ein Benutzer haben muss, um das Megaphon zu verwenden. Wenn Sie es leer lassen, kann jeder das Megaphon verwenden.",
                error: {
                    title: "Fehler",
                    save: {
                        success: "Megaphon-Einstellungen erfolgreich gespeichert",
                        fail: "Fehler beim Speichern der Megaphon-Einstellungen",
                    },
                },
            },
        },
    },
};

export default mapEditor;
