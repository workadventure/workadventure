import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    sideBar: {
        areaEditor: "Płoninu wobdźěłać",
        entityEditor: "Entita wobdźěłać",
        tileEditor: "Kachlu wobdźěłać",
        trashEditor: "papjernik",
        closeMapEditor: "Mapu zacyniś",
        mapManagerActivated: "Mapowy manager je aktiwny",
        exploreTheRoomActivated: "Wobłuk wužiwać",
        areaEditorActivated: "Płoninu wobdźěłać",
        entityEditorActivated: "Entita wobdźěłać",
        trashEditorActivated: "Papjernik wužiwać",
        configureMyRoomActivated: "Mój rum wobdźěłać",
    },
    properties: {
        silentProperty: {
            label: "němy",
            description: "Žane rozmołwy w nutřkownym dowolić.",
        },
        textProperties: {
            label: "Nadpismo",
            placeholder: "Zapodajće tu tekst, kotryž so pokaza, hdyž z objektom interagujeće.",
        },
        focusableProperties: {
            label: "fokusěrujomne",
            description: "Fokusěrujće kameru při zastupje tutoho wobłuka.",
            zoomMarginLabel: "Zoom-Marge",
            defaultButtonLabel: "Fokusěrowanje na",
        },
        jitsiProperties: {
            label: "Jitsi-rum",
            description: "Zahajće jitsi-meeting při zastupje.",
            jitsiUrl: "Jitsi-URL",
            jitsiUrlPlaceholder: "meet.jit.si",
            roomNameLabel: "rumowe mjeno",
            roomNamePlaceholder: "rumowe mjeno",
            defaultButtonLabel: "Jitsi-rum wočinić",
            audioMutedLabel: "Po standardźe němy zapinany",
            moreOptionsLabel: "Wjace opcijow",
            trigger: "interakcije",
            triggerMessage: "Toast-powěsć",
            triggerShowImmediately: "Hnydom při zastupje pokazać",
            triggerOnClick: "Jako miniměrowane w delnjej lisćinje startować",
            triggerOnAction: "Akciski toast z powěsću pokazać",
            closable: "Móže so zawrěć",
            noPrefix: "Z druhimi rumnosćemi dźělić",
            jitsiRoomConfig: {
                addConfig: "Opciju přidać",
                startWithAudioMuted: "Z deaktiwěrowanym mikrofonom startować",
                startWithVideoMuted: "Z deaktiwěrowanej kameru startować",
                cancel: "přetorhnyć",
                validate: "waliděrować",
            },
        },
        audioProperties: {
            label: "Awdiodataju wothrać",
            description: "Awdijo z nastajomnej sylnosću zwuka wothrawać.",
            audioLinkLabel: "Awdiolink",
            audioLinkPlaceholder: "https://xxx.yyy/smthing.mp3",
            defaultButtonLabel: "Hudźbu wothrać",
            volumeLabel: "sylnosć zwuka",
        },
        linkProperties: {
            label: "Link wočinić",
            description: "Wočińće link při zastupje.",
            linkLabel: "Link-URL",
            newTabLabel: "W nowym tabje wočinić",
            trigger: "interakcija",
            triggerMessage: "Toast-powěsć",
            triggerShowImmediately: "Hnydom při zastupje pokazać",
            triggerOnClick: "Jako miniměrowane w delnjej lisćinje startować",
            triggerOnAction: "Akciski toast z powěsću pokazać",
            closable: "Móže so zawrěć",
            allowAPI: "Scripting API dowolić",
            linkPlaceholder: "https://example.com",
            defaultButtonLabel: "Link wočinić",
            width: "šěrokosć",
            policy: "iFrame dowolić",
            policyPlaceholder: "fullscreen",
            errorEmbeddableLink: "Link njeje zapołoženy.",
            messageNotEmbeddableLink: "Tutón link njemóže so zapołožić.",
            warningEmbeddableLink: "Tutón link njemóže so zapołožić.",
            errorInvalidUrl: 'Njepłaćiwa URL. Dyrbi so z "http: /" abo "https: / /" započeć.',
            findOutMoreHere: "Tu zhoniće wjace",
            openPickerSelector: "Wubrać",
            forcedInNewTab: "W nowem tabje wočinić",
        },
        advancedOptions: "Rozšěrjene opcije",
        speakerMegaphoneProperties: {
            label: "Rěčenska cona",
            description: "",
            nameLabel: "Mjeno rěčenskeje cony",
            namePlaceholder: "MySpeakerZone",
        },
        listenerMegaphoneProperties: {
            label: "Słucharska cona",
            description: "",
            nameLabel: "Mjeno słucharskeje cony",
            namePlaceholder: "MyListenerZone",
        },
        chatEnabled: "Chat aktiwizowany",
        startProperties: {
            label: "startowy wobłuk",
            description: "Hdźež ludźo na karće startuja.",
            nameLabel: "mjeno",
            namePlaceholder: "startowy wobłuk",
        },
        exitProperties: {
            label: "Wuchadny wobłuk",
            description: "Hdźež ludźo kartu wopušća.",
            exitMap: "Kartu wopušćić",
            exitMapStartAreaName: "startowy wobłuk",
        },
        youtubeProperties: {
            label: "YouTube-Video wočinić",
            description: "YouTube-Video při zastupje wočinić.",
            error: "Prošu zapodać płaćiwy YouTube-URL",
            disabled: "YouTube-wočinjenje je deaktiwowane.",
        },
        googleDocsProperties: {
            label: "Google Docs wočinić",
            description: "Google Docs při zastupje wočinić.",
            error: "Prošu zapodać płaćiwy Google Docs-URL",
            disabled: "Google Docs-wočinjenje je deaktiwowane.",
        },
        klaxoonProperties: {
            label: "Klaxoon wočinić",
            description: "Klaxoon při zastupje wočinić.",
            error: "Prošu zapodać płaćiwy Klaxoon-URL",
            disabled: "Klaxoon-wočinjenje je deaktiwowane.",
        },
        googleSheetsProperties: {
            label: "Google Sheets wočinić",
            description: "Google Sheets při zastupje wočinić.",
            error: "Prošu zapodać płaćiwy Google Sheets-URL",
            disabled: "Google Sheets-wočinjenje je deaktiwowane.",
        },
        googleSlidesProperties: {
            label: "Google Slides wočinić",
            description: "Google Slides při zastupje wočinić.",
            error: "Prošu zapodać płaćiwy Google Slides-URL",
            disabled: "Google Slides-wočinjenje je deaktiwowane.",
        },
        eraserProperties: {
            label: "Eraser wočinić",
            description: "Eraser při zastupje wočinić.",
            error: "Prošu zapodać płaćiwy Eraser-URL",
            disabled: "Eraser-wočinjenje je deaktiwowane.",
        },
        googleDriveProperties: {
            label: "Google Drive wočinić",
            description: "Google Drive při zastupje wočinić.",
            error: "Prošu zapodać płaćiwy Google Drive-URL",
            disabled: "Google Drive-wočinjenje je deaktiwowane.",
        },
    },
    areaEditor: {
        editInstructions: "Klikńće na płoninu, zo byšće jeje kajkosće změnili.",
        nameLabel: "mjeno",
        nameLabelPlaceholder: "mjeno",
        areaDescription: "pśedstajenje",
        areaDescriptionPlaceholder: "pśedstajenje",
        addDescriptionField: "Pśedstajenje přidać",
    },
    areaEditorInstructions: {
        title: "Kako deluje?",
        description: "Če želite ustvariti novo območje, ga narišite na zemljevidu.",
    },
    entityEditor: {
        itemPicker: {
            searchPlaceholder: "slědźić",
            backToSelectObject: "Wróćo k wubrance",
        },
        trashTool: {
            delete: "Klikńće na objekt, zo byšće jón wotstronił!",
        },
        deleteButton: "wotstronić",
        testInteractionButton: "Interakciju testować",
        buttonLabel: "kneflowe popisanje",
        editInstructions: "Klikńće na objekt, zo byšće jeho kajkosće změnili.",
        selectObject: "Klikńće na objekt, zo byšće jón wuzwolił.",
        objectName: "mjeno",
        objectNamePlaceholder: "mjeno",
        objectDescription: "pśedstajenje",
        objectDescriptionPlaceholder: "pśedstajenje",
        addDescriptionField: "Pśedstajenje přidać",
    },
    settings: {
        loading: "Laden...",
        megaphone: {
            title: "Megaphon",
            description: "Megafon je grat, z kotrymž móžeće Waš hłós přez cyły swět abo rum přenjesć.",
            inputs: {
                spaceName: "mjeno ruma",
                spaceNameHelper:
                    "Mjeno ruma, w kotrymž móže so megafon wužiwać. Hdyž jón prózdne wostajiće, móže so wone po cyłym swěće wužiwać.",
                scope: "wobłuk płaćiwosće",
                world: "swět",
                room: "rum",
                rights: "prawa",
                rightsHelper:
                    "Prawa, kotrež dyrbi wužiwar měć, zo by megafon wužiwać móhł. Hdyž jón prózdny wostajiće, móže kóždy megafon wužiwać.",
                error: {
                    title: "zmylk",
                    save: {
                        success: "Megaphonowe nastajenja wuspěšnje składowane",
                        fail: "Zmylki při składowanju megaphonowych nastajenjow",
                    },
                },
            },
        },
    },
};

export default mapEditor;
