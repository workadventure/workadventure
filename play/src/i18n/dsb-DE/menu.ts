import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const menu: DeepPartial<Translation["menu"]> = {
    title: "Menu",
    icon: {
        open: {
            menu: "Menij wótcyniś",
            invite: "Pśepšosenje pokazaś",
            register: "Registrěrowanje",
            chat: "Chat wótcyniś",
            userlist: "Lisćina wužywarjow",
            openEmoji: "Wótcyń emoji-popup",
            closeEmoji: "Zacyń emoji-menij",
            mobile: "Mobilny menij wótcyniś",
            calendar: "Kalender wótcyniś",
            todoList: "Lisćinu nadawkow wótcyniś",
        },
    },
    visitCard: {
        close: "Zacyniś",
        sendMessage: "Powěsć pósłaś",
    },
    profile: {
        login: "Zalogowaś se",
        logout: "Wulogowaś se",
        helpAndTips: "Pomoc a pokiwki",
    },
    settings: {
        videoBandwidth: {
            title: "Kwalita video",
            low: "Ryjna",
            recommended: "Pśirucona",
            high: "High",
        },
        shareScreenBandwidth: {
            title: "Kwalita pśenosowaneje wobrazowki",
            low: "Ryjna",
            recommended: "Pśirucona",
            high: "High",
        },
        bandwidthConstrainedPreference: {
            title: "Gaž je šyrokosć pásma seśi wobmjezowana",
            maintainFramerateTitle: "Płynne animacije wobchowaś",
            maintainFramerateDescription:
                "Pśednost daś frame rate pśed rozrěšenim. Wužywaj to, gaž su płynne animacije wažne, na pś. pśi streamowanju widejogrow.",
            maintainResolutionTitle: "Tekst cytajobny wóstajiś",
            maintainResolutionDescription:
                "Pśednost daś rozrěšenju pśed frame rate. Wužywaj to, gaž jo cytajobnosć teksta wažna, na pś. pśi prezentacijach abo pśi źělenju koda.",
            balancedTitle: "Frame rate a rozrěšenje w balansu wóstajiś",
            balancedDescription: "Wopytaj se balansu mjazy frame rate a rozrěšenim wobchowaś.",
        },
        language: {
            title: "Rěc",
        },
        privacySettings: {
            title: "Modus njepśibytnosći",
            explanation: 'Jolic až WorkAdventure-tab njejo aktiwny, ga aktiwěrujo se "modus njepśibytnosći".',
            cameraToggle: 'Kameru we "modusu njepśibytnosći" aktiwěrowanu wóstajiś.',
            microphoneToggle: 'Mikrofon we "modusu njepśibytnosći" aktiwěrowany wóstajiś.',
        },
        save: "Zachowaś",
        otherSettings: "Wšykne nastajenja",
        fullscreen: "Połny wobraz",
        notifications: "Powěźeńki",
        enablePictureInPicture: "Wobraz-we-wobrazu aktiwěrowaś",
        chatSounds: "Zwuki chata",
        cowebsiteTrigger: "Kuždy raz se pšašaś, pjerwjej nježli webboki abo Jitsi-Meet-śpy se wótcyniju",
        ignoreFollowRequest: "Ignorěruj pšosby wó slědowanje wót drugich wužywarjow",
        proximityDiscussionVolume: "Głośnosć diskusijow w bliskosći",
        blockAudio: "Wokolne zwuki a muziku blokěrowaś",
        disableAnimations: "Animacije kórty deaktiwěrowaś",
        bubbleSound: "Zwuk bubliny",
        bubbleSoundOptions: {
            ding: "Ding",
            wobble: "Wobble",
        },
        displayVideoQualityStats: "Statistiki kwaliteje video pokazaś",
    },
    invite: {
        description: "Link k tej śpě z drugimi źěliś",
        copy: "Kopěrowaś",
        copied: "Kopěrowany",
        share: "Z drugimi źěliś",
        walkAutomaticallyToPosition: "Awtomatiski k mójej poziciji skócyś",
        selectEntryPoint: "Druge startowe město wužywaś",
        selectEntryPointSelect: "Wuzwól startowe město, pśez kótarež wužywarje pśidu",
    },
    globalMessage: {
        text: "Tekst",
        audio: "Audio",
        warning: "Na wšykne śpy swěta pósłaś",
        enter: "Zapódajśo how swóju powěsć...",
        send: "Wótpósłaś",
    },
    globalAudio: {
        uploadInfo: "Dataju górjej lodowaś",
        error: "Žedna dataja njejo wuzwólona. Pśed wótpósłanim musyš dataju górjej lodowaś.",
        errorUpload:
            "Zmólka pśi górjejlodowanju dataje. Pśespytuj dataju a wopytaj wótnowotki. Jolic až problem buźo dalej wobstojaś, wobroś se na administratora.",
        dragAndDrop: "Dataju how śěgnuś a pušćiś abo kliknuś, aby dataju górjej lodował 🎧",
    },
    contact: {
        gettingStarted: {
            title: "Prědne kšocenje",
            description:
                "Z pomocu WorkAdventure móžoš stwóriś online-swět, źož móžoš se z drugimi spontanje zmakaś a rozgranjaś. Napóraj nejpjerwjej swóju kórtu. Tebje stoj k dispoziciji wjelika licba južo pśigótowanych kórtow wót našogo teama.",
        },
        createMap: {
            title: "Swóju kórtu stwóriś",
            description: "Ty móžoš teke swóju samsku kórtu stwóriś. Cyń za našym wukazanim kšoceń za kšocenju.",
        },
    },
    about: {
        mapInfo: "Informacije wót teje kórty",
        mapLink: "Link ku kórśe",
        copyrights: {
            map: {
                title: "Stwóriśelske pšawa na tej kórśe",
                empty: "Stwóriśel*ka teje kórty njejo žedne informacije k stwóriśelskim pšawam zawóstajił*a.",
            },
            tileset: {
                title: "Stwóriśelske pšawa na tilesetach",
                empty: "Stwóriśel*ka teje kórty njejo žedne informacije k stwóriśelskim pšawam zawóstajił*a. To pak njegroni, až tilesety njepódlaže žednej licency.",
            },
            audio: {
                title: "Stwóriśelske pšawa na audio-datajach",
                empty: "Stwóriśel*ka teje kórty njejo žedne informacije k stwóriśelskim pšawam zawóstajił*a. To pak njegroni, až audio-dataje njepódlaže žednej licency.",
            },
        },
    },
    chat: {
        matrixIDLabel: "Waš Matrix ID",
        settings: "Nastajenja",
        resetKeyStorageUpButtonLabel: "Wašu klucowu składarnju slědk stajiś",
        resetKeyStorageConfirmationModal: {
            title: "Wobkšuśenje slědk stajenja klucoweje składarnje",
            content: "Cośo wašu klucowu składarnju slědk stajiś. Sćo se wěsty?",
            warning:
                "Slědk stajenje klucoweje składarnje wótpórajo wašu aktualnu sesiju a wšyknych dowěry gódnych wužywarjow. Móžośo pśistup k někotarym pśedchadnym powěsćam zgubiś a wjace njejsćo ako dowěry gódny wužywaŕ spóznany. Zawěsććo, až rozmějośo wuslědki toś teje akcije pśed pókšacowanim.",
            cancel: "Pśetergnuś",
            continue: "Dalej",
        },
    },
    sub: {
        profile: "Profil",
        settings: "Nastajenja",
        credit: "Informacije dla teje kórty",
        globalMessages: "Globalne powěsći",
        contact: "Kontakt",
        report: "Zmólku pśipowěźeś",
        chat: "Chat",
        help: "Pomoc a tutorials",
        contextualActions: "Kontekstowe akcije",
        shortcuts: "Tastowe skrotconki",
    },
    shortcuts: {
        title: "Tastowe skrotconki",
        keys: "Skrotconka",
        actions: "Akcija",
        moveUp: "Górjej",
        moveDown: "Dołojko",
        moveLeft: "Nalěwo",
        moveRight: "Napšawo",
        speedUp: "Běžaś",
        interact: "Interagěrowaś",
        follow: "Slědowaś",
        openChat: "Chat wótcyniś",
        openUserList: "Lisćinu wužywarjow wótcyniś",
        toggleMapEditor: "Kartowy editor pokazaś/schowaś",
        rotatePlayer: "Grajaka wobwjertowaś",
        emote1: "Emocion 1",
        emote2: "Emocion 2",
        emote3: "Emocion 3",
        emote4: "Emocion 4",
        emote5: "Emocion 5",
        emote6: "Emocion 6",
        openSayPopup: 'Popup „groniś" wótcyniś',
        openThinkPopup: 'Popup „mysliś" wótcyniś',
        walkMyDesk: "K mójomu blidkoju hyś",
    },
};

export default menu;
