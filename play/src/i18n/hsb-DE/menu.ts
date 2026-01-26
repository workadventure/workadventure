import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "meni",
    icon: {
        open: {
            menu: "meni wočinić",
            invite: "přeprošenje wozjewić",
            register: "registrować",
            chat: "chat wočinić",
            userlist: "wužiwarska lisćina",
            openEmoji: "wuzwoleny emojijowy popup wočinić",
            closeEmoji: "emoji-meni zawrěć",
            mobile: "mobilny meni wočinić",
            calendar: "kalender wočinić",
            todoList: "lisćinu nadawkow wočinić",
        },
    },
    visitCard: {
        close: "zawrěć",
        sendMessage: "powěsć pósłać",
    },
    profile: {
        login: "přizjewić",
        logout: "wotzjewić",
    },
    settings: {
        videoBandwidth: {
            title: "Kwalita wideja",
            low: "Niska",
            recommended: "Doporučena",
            high: "High",
        },
        shareScreenBandwidth: {
            title: "Kwalita přenosowaneje wobrazowki",
            low: "Niska",
            recommended: "Doporučena",
            high: "High",
        },
        bandwidthConstrainedPreference: {
            title: "Hdyž je syćowa šěrokosć pasma wobmjezowana",
            maintainFramerateTitle: "Płynne animacije wobchować",
            maintainFramerateDescription:
                "Płynnosć (frejmratu) před wubraženosću preferować. To wužiwaj, hdyž su płynne animacije wažne, na př. při streamowanju widejohrow.",
            maintainResolutionTitle: "Tekst čitajomny wostajić",
            maintainResolutionDescription:
                "Wubraženosć před frejmratu preferować. To wužiwaj, hdyž je čitajomnosć teksta wažna, na př. při prezentacijach abo při dźělenju koda.",
            balancedTitle: "Płynnosć a wubraženosć w balansu wostajić",
            balancedDescription: "Sprochuj, balansu mjez płynnosću a wubraženosću wostajić.",
        },
        language: {
            title: "rěč",
        },
        privacySettings: {
            title: "modus njepřitomnosće",
            explanation: 'Jeli Work Adventure Tab aktiwny njeje, so do „modusa njepřitomnosće" přešaltuje.',
            cameraToggle: 'Kameru w „modusu njepřitomnosće" aktiwěrowanu wostajić.',
            microphoneToggle: 'Mikrofon w „modusu njepřitomnosće" aktiwěrowany wostajić.',
        },
        save: "składować",
        otherSettings: "wšě nastajenja",
        fullscreen: "połny wobraz",
        notifications: "powěsće",
        enablePictureInPicture: "wobraz-we-wobrazu aktiwěrować",
        chatSounds: "zwuki chata",
        cowebsiteTrigger: "Kóždy raz so naprašować, prjedy hač so webstrony abo Jitsi Meet rumy wotewrje",
        ignoreFollowRequest: "Ignoruj naprašowanja wo sćěhowanje wot druhich wužiwarjow",
        proximityDiscussionVolume: "hłošnosć diskusijow w bliskosći",
        blockAudio: "wokolne zwuki a hudźbu blokować",
        disableAnimations: "animacije karty znjemóžnić",
        bubbleSound: "zwuk bubliny",
        bubbleSoundOptions: {
            ding: "Ding",
            wobble: "Wobble",
        },
        displayVideoQualityStats: "statistiki kwaliteje wideja pokazać",
    },
    invite: {
        description: "Link do tuteho ruma dźělić!",
        copy: "kopěrować",
        copied: "kopěrowany",
        share: "dźělić",
        walkAutomaticallyToPosition: "awtomatisce k mojej poziciji hić",
        selectEntryPoint: "druhi startowy dypk wužiwać",
        selectEntryPointSelect: "wubjer startowy dypk, přez kotryž wužiwarjo přidu",
    },
    globalMessage: {
        text: "tekst",
        audio: "audijo",
        warning: "na wšitke rumy tuteho swěta pósłać",
        enter: "Zapisaj tu swoju powěsć...",
        send: "wotposłać",
    },
    globalAudio: {
        uploadInfo: "dataju nakładować",
        error: "Žanu dataju wuzwolili. Dyrbiš před rozpósłanjom dataju nakładować.",
        errorUpload:
            "Zmylki při nakładowanju dataje. Prošu přepruwujće Wašu dataju a spytajće to znowa. Jeli problem dale wobsteji, wobroćće so na administratora.",
        dragAndDrop: "Dataju tu ćahnyć a pušćić abo kliknyć, zo byšće dataju nakładował 🎧",
    },
    contact: {
        gettingStarted: {
            title: "prěnje kročele",
            description:
                "Z Work Adventure móžeš onlinowy swět stworić w kotrymž móžeš so spontanje z druhimi zetkać a rozmołwjeć. Zestajej jako prěnje swójsku kartu. Steji ći wulki wuběr na hotowych kartach wot našeho teama na wuběr.",
        },
        createMap: {
            title: "swójsku kartu zestajeć",
            description: "Móžeš tež swoju swójsku kartu zestajeć. Sćěhuj k tomu naš kročel-za kročel nawod.",
        },
    },
    about: {
        mapInfo: "informacije wo tutej karće",
        mapLink: "link ke karće",
        copyrights: {
            map: {
                title: "awtorske prawo karty",
                empty: "Zestajer karty njeje žane informacije k awtorskemu prawu zapołožił.",
            },
            tileset: {
                title: "awtorske prawo Tilesetow",
                empty: "Zestajer karty njeje žane informacije k awtorskemu prawu Tilesetow zapołožił. To njewoznamjenja, zo Tilesety žanej licency njepodleža.",
            },
            audio: {
                title: "awtorske prawo awdijodatajow",
                empty: "Zestajer karty njeje žane informacije k awtorskemu prawu awdijodatajow zapołožił. Tole njewoznamjenja, zo awdiodataje žanej licency njepodleža.",
            },
        },
    },
    chat: {
        matrixIDLabel: "Waš Matrix ID",
        settings: "nastajenja",
        resetKeyStorageUpButtonLabel: "wašu klučowu składarnju wróćo stajić",
        resetKeyStorageConfirmationModal: {
            title: "wobkrućenje wróćo stajenja klučoweje składarnje",
            content: "Chceće wašu klučowu składarnju wróćo stajić. Sće wěsty?",
            warning:
                "Wróćo stajenje klučoweje składarnje wotstroni wašu aktualnu sesiju a wšěch dowěry hódnych wužiwarjow. Móžeće přistup k někotrym předchadnym powěsćam zhubić a wjace njejsće jako dowěry hódny wužiwar spóznaty. Zawěsćće, zo rozumjeće wuslědki tuteje akcije před pokročowanjom.",
            cancel: "přetorhnyć",
            continue: "pokročować",
        },
    },
    sub: {
        profile: "profil",
        settings: "nastajenja",
        invite: "přeprošenje",
        credit: "wo karće",
        globalMessages: "globalne powěsće",
        contact: "kontakt",
        report: "zmylki připowědźić",
        chat: "chat",
        help: "pomoc a nawody",
        contextualActions: "kontekstowe akcije",
        shortcuts: "tastowe skrótšenki",
    },
    shortcuts: {
        title: "tastowe skrótšenki",
        keys: "skrótšenka",
        actions: "akcija",
        moveUp: "horje",
        moveDown: "dele",
        moveLeft: "nalěwo",
        moveRight: "naprawo",
        speedUp: "běhać",
        interact: "interagować",
        follow: "sćěhować",
        openChat: "chat wočinić",
        openUserList: "lisćinu wužiwarjow wočinić",
        toggleMapEditor: "kartowy editor pokazać/schować",
        rotatePlayer: "hrajerja wobwjertować",
        emote1: "emocion 1",
        emote2: "emocion 2",
        emote3: "emocion 3",
        emote4: "emocion 4",
        emote5: "emocion 5",
        emote6: "emocion 6",
        openSayPopup: 'popup „rěkać" wočinić',
        openThinkPopup: 'popup „myslić" wočinić',
        walkMyDesk: "k mojemu blidkej hić",
    },
};

export default menu;
