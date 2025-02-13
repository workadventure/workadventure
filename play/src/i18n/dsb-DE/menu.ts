import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

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
        },
    },
    visitCard: {
        close: "Zacyniś",
    },
    profile: {
        login: "Zalogowaś se",
        logout: "Wulogowaś se",
    },
    settings: {
        videoBandwidth: {
            title: "Kwalita video",
            low: "Ryjna",
            recommended: "Pśirucona",
            unlimited: "Njewobgranicowana",
        },
        shareScreenBandwidth: {
            title: "Kwalita pśenosowaneje wobrazowki",
            low: "Ryjna",
            recommended: "Pśirucona",
            unlimited: "Njewobgranicowana",
        },
        language: {
            title: "Rěc",
        },
        privacySettings: {
            title: "Modus njepśibytnosći",
            explanation: "Jolic až WorkAdventure-tab njejo aktiwny, ga aktiwěrujo se „modus njepśibytnosći“.",
            cameraToggle: "Kameru we „modusu njepśibytnosći“ aktiwěrowanu wóstajiś.",
            microphoneToggle: "Mikrofon we „modusu njepśibytnosći“ aktiwěrowany wóstajiś.",
        },
        save: "Zachowaś",
        fullscreen: "Połny wobraz",
        notifications: "Powěźeńki",
        cowebsiteTrigger: "Kuždy raz se pšašaś, pjerwjej nježli webboki abo Jitsi-Meet-śpy se wótcyniju",
        ignoreFollowRequest: "Ignorěruj pšosby wó slědowanje wót drugich wužywarjow",
    },
    invite: {
        description: "Link k tej śpě z drugimi źěliś",
        copy: "Kopěrowaś",
        share: "Z drugimi źěliś",
        walkAutomaticallyToPosition: "Awtomatiski k mójej poziciji skócyś",
        selectEntryPoint: "Startowe město wuzwóliś",
    },
    globalMessage: {
        text: "Tekst",
        audio: "Audio",
        warning: "Pósłaś do wšyknych śpow togo swěta",
        enter: "Napiš how powěsć...",
        send: "Wótpósłaś",
    },
    globalAudio: {
        uploadInfo: "Dataju górjej lodowaś",
        error: "Žedna dataja njejo wuzwólona. Pśed wótpósłanim musyš dataju górjej lodowaś.",
        errorUpload:
            "Zmólka pśi górjejlodowanju dataje. Pśespytuj dataju a wopytaj wótnowotki. Jolic až problem buźo dalej wobstojaś, wobroś se na administratora.",
    },
    contact: {
        gettingStarted: {
            title: "Prědne kšocenje",
            description:
                "Z pomocu WorkAdventure móžoš stwóriś online-swět, źož móžoš se z drugimi spontanje zmakaś a rozgranjaś. Napóraj nejpjerwjej swóju kórtu. Tebje stoj k dispoziciji wjelika licba južo pśigótowanych kórtow wót našogo teama.",
        },
        createMap: {
            title: "Swóju kórtu stwóriś ",
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
    sub: {
        settings: "Nastajenja",
        invite: "Pśepšosenje",
        credit: "Informacije dla teje kórty",
        globalMessages: "Globalne powěsći",
        contact: "Kontakt",
        report: "Zmólku pśipowěźeś",
    },
};

export default menu;
