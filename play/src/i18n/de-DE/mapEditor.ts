import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    sideBar: {
        areaEditor: "Fläche bearbeiten",
        entityEditor: "Entität bearbeiten",
        tileEditor: "Kachel bearbeiten",
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
    },
    entityEditor: {
        itemPicker: {
            searchPlaceholder: "Forschen",
        },
        deleteButton: "Löschen",
        testInteractionButton: "Interaktion testen",
        buttonLabel: "Knopfbeschrifung",
        editInstructions: "Klicken Sie auf ein Objekt, um seine Eigenschaften zu ändern.",
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
