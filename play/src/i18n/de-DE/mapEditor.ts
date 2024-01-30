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
        silentProperty: {
            label: "Stumm",
            description: "Keine Gespräche im Inneren erlauben.",
        },
        textProperties: {
            label: "Überschrift",
            placeholder: "Geben Sie hier den Text ein, der angezeigt wird, wenn Sie mit dem Objekt interagieren.",
        },
        focusableProperties: {
            label: "Fokussierbar",
            description: "Fokussieren Sie die Kamera beim Betreten dieses Bereichs.",
            zoomMarginLabel: "Zoom-Marge",
            defaultButtonLabel: "Fokussieren auf",
        },
        jitsiProperties: {
            label: "Jitsi-Raum",
            description: "Starten Sie ein Jitsi-Meeting beim Betreten.",
            jitsiUrl: "Jitsi-URL",
            jitsiUrlPlaceholder: "meet.jit.si",
            roomNameLabel: "Raumname",
            roomNamePlaceholder: "Raumname",
            defaultButtonLabel: "Jitsi-Raum öffnen",
            audioMutedLabel: "Standardmäßig stummgeschaltet",
            moreOptionsLabel: "Mehr Optionen",
            trigger: "Interaktion",
            triggerMessage: "Toast-Nachricht",
            triggerShowImmediately: "Sofort beim Betreten anzeigen",
            triggerOnClick: "Als minimiert in der unteren Leiste starten",
            triggerOnAction: "Aktionstoast mit Nachricht anzeigen",
            closable: "Kann geschlossen werden",
            noPrefix: "Mit anderen Räumen teilen",
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
            description: "Audio mit einstellbarer Lautstärke abspielen.",
            audioLinkLabel: "Audiolink",
            audioLinkPlaceholder: "https://xxx.yyy/smthing.mp3",
            defaultButtonLabel: "Musik abspielen",
            volumeLabel: "Lautstärke",
        },
        linkProperties: {
            label: "Link öffnen",
            description: "Öffnen Sie einen Link beim Betreten.",
            linkLabel: "Link-URL",
            newTabLabel: "In neuem Tab öffnen",
            trigger: "Interaktion",
            triggerMessage: "Toast-Nachricht",
            triggerShowImmediately: "Sofort beim Betreten anzeigen",
            triggerOnClick: "Als minimiert in der unteren Leiste starten",
            triggerOnAction: "Aktionstoast mit Nachricht anzeigen",
            closable: "Kann geschlossen werden",
            allowAPI: "Scripting API erlauben",
            linkPlaceholder: "https://example.com",
            defaultButtonLabel: "Link öffnen",
            width: "Breite",
            policy: "iFrame erlauben",
            policyPlaceholder: "fullscreen",
            errorEmbeddableLink: "Der Link ist nicht einbettbar",
            messageNotEmbeddableLink: "Dieser Link kann nicht eingebettet werden.",
            warningEmbeddableLink: "Dieser Link kann nicht eingebettet werden.",
            errorInvalidUrl: 'Ungültige URL. Es muss mit "http://" oder "https://" beginnen.',
            findOutMoreHere: "Hier erfahren Sie mehr",
        },
        advancedOptions: "Erweiterte Optionen",
        speakerMegaphoneProperties: {
            label: "Sprecherzone",
            description: "",
            nameLabel: "Sprecherzonenname",
            namePlaceholder: "MySpeakerZone",
        },
        listenerMegaphoneProperties: {
            label: "Besucherzone",
            description: "",
            nameLabel: "Besucherzonenname",
            namePlaceholder: "MyListenerZone",
        },
        chatEnabled: "Chat aktiviert",
        startProperties: {
            label: "Startbereich",
            description: "Wo die Leute auf der Karte starten.",
            nameLabel: "Name",
            namePlaceholder: "Startbereich",
        },
        exitProperties: {
            label: "Ausgangsbereich",
            description: "Wo die Leute die Karte verlassen.",
            exitMap: "Karte verlassen",
            exitMapStartAreaName: "Startbereich",
        },
    },
    areaEditor: {
        editInstructions: "Klicken Sie auf eine Fläche, um ihre Eigenschaften zu ändern.",
        nameLabel: "Name",
    },
    entityEditor: {
        itemPicker: {
            searchPlaceholder: "Forschen",
            backToSelectObject: "Zurück zur Auswahl",
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
