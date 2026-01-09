import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "Rozumjeno!",
    edit: "Wobdźěłać",
    cancel: "Přetorhnyć",
    close: "Začinić",
    login: "Přizjewić",
    map: "Nastroje",
    profil: "Waše mjeno wobdźěłać",
    startScreenSharing: "Dźělenje wobrazowki startować",
    stopScreenSharing: "Dźělenje wobrazowki zastajić",
    screenSharingMode: "Modus dźělenja wobrazowki",
    calendar: "Kalender",
    todoList: "Lisćina nadawkow",
    woka: "Waš avatar přiměrić",
    companion: "Towaršiće přidać",
    test: "Moje nastajenja testować",
    editCamMic: "Kameru / mikrofon wobdźěłać",
    allSettings: "Wšě nastajenja",
    globalMessage: "Globalnu powěsć pósłać",
    mapEditor: "Kartowy editor",
    mapEditorMobileLocked: "Kartowy editor je w mobilnym modusu zawrjeny",
    mapEditorLocked: "Kartowy editor je zawrjeny 🔐",
    app: "Třeće nałoženja",
    camera: {
        disabled: "Waša kamera je deaktiwowana",
        activate: "Wašu kameru aktiwěrować",
        noDevices: "Žane kamerowe graty namakane",
        setBackground: "Pozadk nastajić",
        blurEffects: "Rozmazanske efekty",
        disableBackgroundEffects: "Pozadkowe efekty deaktiwěrować",
        close: "Začinić",
    },
    microphone: {
        disabled: "Waš mikrofon je deaktiwowany",
        activate: "Waš mikrofon aktiwěrować",
        noDevices: "Žane mikrofonowe graty namakane",
    },
    speaker: {
        disabled: "Waš wótřerěčak je deaktiwowany",
        activate: "Waš wótřerěčak aktiwěrować",
        noDevices: "Žane wótřerěčakowe graty namakane",
    },
    status: {
        ONLINE: "Online",
        AWAY: "Njejsu tu",
        BACK_IN_A_MOMENT: "Wróću so bórze",
        DO_NOT_DISTURB: "Njewobćežować",
        BUSY: "Zabuzowany",
        OFFLINE: "Offline",
        SILENT: "Němy",
        JITSI: "W zetkanju",
        BBB: "W zetkanju",
        DENY_PROXIMITY_MEETING: "Njeje k dispoziciji",
        SPEAKER: "W zetkanju",
        LIVEKIT: "W zetkanju",
        LISTENER: "W zetkanju",
    },
    subtitle: {
        camera: "Kamera",
        microphone: "Mikrofon",
        speaker: "Awdijowy wudaće",
    },
    help: {
        chat: {
            title: "Tekstowu powěsć pósłać",
            desc: "Dźělće swoje ideje abo započńće diskusiju, direktnje pisanje. Jednore, jasne, efektiwne.",
        },
        users: {
            title: "Lisćinu wužiwarjow pokazać",
            desc: "Hlejće, štó je tu, přistupujće k jich wizitce, pósćelće jim powěsć abo kńeće k nim z jednym klikom!",
        },
        emoji: {
            title: "Emoji pokazać",
            desc: "Wurazće, kak so čuće, z jenož jednym klikom z emoji-reakcijemi. Jenož tknjenje a hić!",
        },
        audioManager: {
            title: "Hłošnosć wokolnych zwukow",
            desc: "Konfigurujće awdijowu hłošnosć, kliknje tu.",
            pause: "Klikńće tu, zo byšće awdijo zastajił",
            play: "Klikńće tu, zo byšće awdijo wothrał",
            stop: "Klikńće tu, zo byšće awdijo zastajił",
        },
        audioManagerNotAllowed: {
            title: "Wokolne zwuki zablokowane",
            desc: "Waš wobhladowak je wokolne zwuki wothrać zawoborał. Klikńće na symbol, zo byšće wothraće startował.",
        },
        follow: {
            title: "Prajić, zo by wam sćěhował",
            desc: "Móžeće wužiwarja prajić, zo by wam sćěhował, a jeli so tute naprašowanje akceptuje, jeho Woka budźe was awtomatisce sćěhować, zo by so plynne zwjazowanje załožiło.",
        },
        unfollow: {
            title: "Sćěhowanje zastajić",
            desc: "Móžeće kóždy čas wubrać, zo byšće wužiwarja wjace njesćěhował. Waš Woka budźe potom sćěhowanje zastajić a wam wašu swobodu hibanja wróćić.",
        },
        lock: {
            title: "Rozmołwu zawrěć",
            desc: "Hdyž tutu funkciju aktiwěrujeće, zawěsćeće, zo nihdo njemóže so diskusiji přidać. Sće knjez wašeho ruma, a jenož tute, kotrež su hižo přitomne, móža interagować.",
        },
        megaphone: {
            title: "Megafon zastajić",
            desc: "Zastajće wusyłanje wašeje powěsće na wšěch wužiwarjow.",
        },
        mic: {
            title: "Waš mikrofon aktiwěrować/deaktiwěrować",
            desc: "Aktiwěrujće abo wupinajće waš mikrofon, zo by druzy was podczas diskusije słyšeli.",
        },
        micDisabledByStatus: {
            title: "Mikrofon deaktiwowany",
            desc: 'Waš mikrofon je deaktiwowany, dokelž sće w statusu "{status}".',
        },
        cam: {
            title: "Wašu kameru aktiwěrować/deaktiwěrować",
            desc: "Aktiwěrujće abo wupinajće wašu kameru, zo by druzym wobdźělnikam waš widejo pokazali.",
        },
        camDisabledByStatus: {
            title: "Kamera deaktiwowana",
            desc: 'Waša kamera je deaktiwowana, dokelž sće w statusu "{status}".',
        },
        share: {
            title: "Wašu wobrazowku dźělić",
            desc: "Chceće wašu wobrazowku z druhimi wužiwarjemi dźělić? Móžeće! Móžeće wašu wobrazowku wšěm w chatu pokazać, a móžeće wubrać, zo byšće cyłu wobrazowku abo jenož wěsty wokno dźělili.",
        },
        apps: {
            title: "Třeće nałoženja",
            desc: "Maće swobodu, zo byšće eksterne nałoženja nawigowali, mjeztym zo w našim nałoženju wostaće, za plynne a wobohatene dožiwjenje.",
        },
        roomList: {
            title: "Lisćina rumow",
            desc: "Přepytajće lisćinu rumow, zo byšće widźeli, štó je přitomny, a přidajće so z jednym klikom rozmołwje.",
        },
        calendar: {
            title: "Kalender",
            desc: "Hlejće swoje přichodne zetkanja a přidajće so jim direktnje z WorkAdventure.",
        },
        todolist: {
            title: "Lisćina nadawkow",
            desc: "Rjadujće swoje nadawki dnja, bjezto zo byšće swój dźěłowy rum wopušćili.",
        },
        pictureInPicture: {
            title: "Wobraz we wobrazu",
            descDisabled:
                "Bohužel tuta funkcija njeje na wašim gratu k dispoziciji ❌. Prošu spytajće druhi grat abo wobhladowak wužiwać, na přikład Chrome abo Edge, zo byšće přistup k tutej funkciji dóstał.",
            desc: "Móžeće funkciju wobraz we wobrazu wužiwać, zo byšće widejo abo prezentaciju woglědowali, mjeztym zo sće w rozmołwje. Klikńće jenož na symbol wobraz we wobrazu a wužiwajće swój wobsah.",
        },
    },
    listStatusTitle: {
        enable: "Waš status změnić",
    },
    externalModule: {
        status: {
            onLine: "Status je w porjadku ✅",
            offLine: "Status je offline ❌",
            warning: "Status je warnowanje ⚠️",
            sync: "Status so synchronizuje 🔄",
        },
    },
    featureNotAvailable: "Funkcija za waš rum njeje k dispoziciji 😭",
    issueReport: {
        menuAction: "Problem zdźělić",
        formTitle: "Problem zdźělić",
        emailLabel: "E-mejl (njetrjebany)",
        nameLabel: "Mjeno (njetrjebane)",
        descriptionLabel: "Wopisanje* (trjebane)",
        descriptionPlaceholder: "Što je problem? Što sće wočakowali?",
        submitButtonLabel: "Zmylkowy rozpraw zdźělić",
        cancelButtonLabel: "Přetorhnyć",
        confirmButtonLabel: "Wobkrućić",
        addScreenshotButtonLabel: "Wobrazowku přidać",
        removeScreenshotButtonLabel: "Wobrazowku wotstronić",
        successMessageText: "Dźakujemy so za waše zdźělenje! Přepruwujemy jo tak bórze kaž móžno.",
        highlightToolText: "Wuzběhnyć",
        hideToolText: "Schować",
        removeHighlightText: "Wotstronić",
    },
    personalDesk: {
        label: "K swojemu pisaćemu blidkej",
        unclaim: "Mój pisaće blidko wotwołać",
        errorNoUser: "Wužiwarske informacije njejsu so namakali",
        errorNotFound: "Nimaće hišće wosobinske pisaće blidko",
        errorMoving: "Wosobinske pisaće blidko njeje so docpěło",
        errorUnclaiming: "Wosobinske pisaće blidko njeje so wotwołało",
    },
};

export default actionbar;
