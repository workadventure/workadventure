import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "Rozměto!",
    edit: "Wobźěłaś",
    cancel: "Pśetergnuś",
    close: "Zacyniś",
    login: "Pśizjawjaś",
    map: "Rědy",
    profil: "Wašo mě wobźěłaś",
    startScreenSharing: "Źělenje wobrazowki startowaś",
    stopScreenSharing: "Źělenje wobrazowki zastajiś",
    screenSharingMode: "Modus źělenja wobrazowki",
    calendar: "Kalender",
    todoList: "Lisćina nadawkow",
    woka: "Waš avatar pśiměriś",
    companion: "Towariša pśidaś",
    test: "Móje nastajenja testowaś",
    editCamMic: "Kameru / mikrofon wobźěłaś",
    allSettings: "Wšykne nastajenja",
    globalMessage: "Globalnu powěsć pósłaś",
    mapEditor: "Kartowy editor",
    mapEditorMobileLocked: "Kartowy editor jo w mobilnem modusu zawrěty",
    mapEditorLocked: "Kartowy editor jo zawrěty 🔐",
    app: "Tśeśe nałoženja",
    camera: {
        disabled: "Waša kamera jo deaktiwěrowana",
        activate: "Wašu kameru aktiwěrowaś",
        noDevices: "Žedne kamerowe rědy namakane",
        setBackground: "Pozadk nastajiś",
        blurEffects: "Rozmazowe efekty",
        disableBackgroundEffects: "Pozadkowe efekty deaktiwěrowaś",
        close: "Zacyniś",
    },
    microphone: {
        disabled: "Waš mikrofon jo deaktiwěrowany",
        activate: "Waš mikrofon aktiwěrowaś",
        noDevices: "Žedne mikrofonowe rědy namakane",
    },
    speaker: {
        disabled: "Waš głośnik jo deaktiwěrowany",
        activate: "Waš głośnik aktiwěrowaś",
        noDevices: "Žedne głośnikowe rědy namakane",
    },
    status: {
        ONLINE: "Online",
        AWAY: "Njejsu tam",
        BACK_IN_A_MOMENT: "Wrośu se skóro",
        DO_NOT_DISTURB: "Njewobśěžowaś",
        BUSY: "Zabuzowany",
        OFFLINE: "Offline",
        SILENT: "Němy",
        JITSI: "W zetkanju",
        BBB: "W zetkanju",
        DENY_PROXIMITY_MEETING: "Njejo k dispoziciji",
        SPEAKER: "W zetkanju",
        LIVEKIT: "W zetkanju",
        LISTENER: "W zetkanju",
    },
    subtitle: {
        camera: "Kamara",
        microphone: "Mikrofon",
        speaker: "Awdijowy wudaśe",
    },
    help: {
        chat: {
            title: "Tekstowu powěsć pósłaś",
            desc: "Źělśo swóje ideje abo zachopśo diskusiju, direktnje pisanje. Jadnore, jasne, efektiwne.",
        },
        users: {
            title: "Lisćinu wužywarjow pokazaś",
            desc: "Glejśo, chto jo tam, pśistupujśo k jich wizitce, pósćelśo jim powěsć abo kńeśo k nim z jadnym klikom!",
        },
        emoji: {
            title: "Emoji pokazaś",
            desc: "Wurazśo, kak se cuśo, z jano jadnym klikom z emoji-reakcijami. Jano tknjenje a hyś!",
        },
        audioManager: {
            title: "Głośnosć wokolnych zwukow",
            desc: "Konfigurěrujśo awdijowu głośnosć, kliknjo how.",
            pause: "Klikniśo how, aby awdijo zastajił",
            play: "Klikniśo how, aby awdijo wótgrał",
            stop: "Klikniśo how, aby awdijo zastajił",
        },
        audioManagerNotAllowed: {
            title: "Wokolne zwuki zablokěrowane",
            desc: "Waš browser jo wokolne zwuki wótraś zawoborał. Klikniśo na symbol, aby wótgraśe startował.",
        },
        follow: {
            title: "Pšašaś, aby wam slědujo",
            desc: "Móžośo wužywarja pšašaś, aby wam slědujo, a jolic se toś to napšašowanje akceptěrujo, jogo Woka buźo was awtomatiski slědowaś, aby se plynne zwězowanje załožyło.",
        },
        unfollow: {
            title: "Slědowanje zastajiś",
            desc: "Móžośo kuždy cas wubraś, aby wužywarja wěcej njeslědujo. Waš Woka buźo pótom slědowanje zastajiś a wam wašu lichotu gibanja wrośiś.",
        },
        lock: {
            title: "Rozgrono zawrěś",
            desc: "Gaž toś tu funkciju aktiwěrujośo, zawěsćijośo, až njechtó njemóžo se diskusiji pśidaś. Sćo kněz wašogo ruma, a jano te, kótarež su južo pśitomne, mógu interagěrowaś.",
        },
        megaphone: {
            title: "Megafon zastajiś",
            desc: "Zastajśo wusyłanje wašeje powěsći na wšyknych wužywarjow.",
        },
        mic: {
            title: "Waš mikrofon aktiwěrowaś/deaktiwěrowaś",
            desc: "Aktiwěrujśo abo wupinajśo waš mikrofon, aby druge was pśi diskusiji słyšali.",
        },
        micDisabledByStatus: {
            title: "Mikrofon deaktiwěrowany",
            desc: 'Waš mikrofon jo deaktiwěrowany, dokulaž sćo w statusu "{status}".',
        },
        cam: {
            title: "Wašu kameru aktiwěrowaś/deaktiwěrowaś",
            desc: "Aktiwěrujśo abo wupinajśo wašu kameru, aby drugim wobźělnikam waš wideo pokazali.",
        },
        camDisabledByStatus: {
            title: "Kamara deaktiwěrowana",
            desc: 'Waša kamera jo deaktiwěrowana, dokulaž sćo w statusu "{status}".',
        },
        share: {
            title: "Wašu wobrazowku źěliś",
            desc: "Cośo wašu wobrazowku z drugimi wužywarjami źěliś? Móžośo! Móžośo wašu wobrazowku wšyknym w chatu pokazaś, a móžośo wubraś, aby cyłu wobrazowku abo jano wěsty wokno źělili.",
        },
        apps: {
            title: "Tśeśe nałoženja",
            desc: "Maśo lichotu, aby eksterne nałoženja nawigěrowali, mjaztym až w našem nałoženju wóstawaśo, za plynne a wobohatone dožywjenje.",
        },
        roomList: {
            title: "Lisćina rumow",
            desc: "Pśepytajśo lisćinu rumow, aby widźeli, chto jo pśitomny, a pśidajśo se z jadnym klikom rozgronjeju.",
        },
        calendar: {
            title: "Kalender",
            desc: "Glejśo swóje pśichodne zetkanja a pśidajśo se jim direktnje z WorkAdventure.",
        },
        todolist: {
            title: "Lisćina nadawkow",
            desc: "Rědowaśo swóje nadawki dnja, bźez togo aby swój źěłowy rum wopušćili.",
        },
        pictureInPicture: {
            title: "Wobraz we wobrazu",
            descDisabled:
                "Bóžko toś ta funkcija njejo na wašom rěźe k dispoziciji ❌. Pšosym wopytajśo drugi rěd abo browser wužywaś, na pśikład Chrome abo Edge, aby pśistup k toś tej funkciji dostał.",
            desc: "Móžośo funkciju wobraz we wobrazu wužywaś, aby wideo abo pśedstajenje woglědali, mjaztym až sćo w rozgronje. Klikniśo jadnorje na symbol wobraz we wobrazu a wužywajśo swój wopśimjeś.",
        },
    },
    listStatusTitle: {
        enable: "Waš status změniś",
    },
    externalModule: {
        status: {
            onLine: "Status jo w pórěźe ✅",
            offLine: "Status jo offline ❌",
            warning: "Status jo warnowanje ⚠️",
            sync: "Status se synchronizěrujo 🔄",
        },
    },
    featureNotAvailable: "Funkcija za waš rum njejo k dispoziciji 😭",
    issueReport: {
        menuAction: "Problem k wěsći daś",
        formTitle: "Problem k wěsći daś",
        emailLabel: "E-mail (njetrjebany)",
        nameLabel: "Mě (njetrjebane)",
        descriptionLabel: "Wopisanje* (trjebane)",
        descriptionPlaceholder: "Co jo problem? Co sćo wótcakowali?",
        submitButtonLabel: "Zmólkowy rozpšaw k wěsći daś",
        cancelButtonLabel: "Pśetergnuś",
        confirmButtonLabel: "Wobkšuśiś",
        addScreenshotButtonLabel: "Wobrazowku pśidaś",
        removeScreenshotButtonLabel: "Wobrazowku wótpóraś",
        successMessageText: "Źěkujomy se za wašo k wěsći daśe! Pśepruwujomy jo tak skóro ako móžno.",
        highlightToolText: "Wuzběgnyś",
        hideToolText: "Schowaś",
        removeHighlightText: "Wótpóraś",
    },
    personalDesk: {
        label: "K mójomu pisanjejomu blidkoju",
        unclaim: "Mójo pisanje blidko wótpóraś",
        errorNoUser: "Wužywarske informacije njejsu se namakali",
        errorNotFound: "Njamajo hyšći wósobinske pisanje blidko",
        errorMoving: "Wósobinske pisanje blidko njejo se docyło",
        errorUnclaiming: "Wósobinske pisanje blidko njejo se wótpórało",
    },
};

export default actionbar;
