import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "Warnowanje!",
    content: `Tutón swět docpěje bórze maksimalnu kapacitu. Móžeš kapacitu wosoby <a href="{upgradeLink}" target="_blank">tule<a> powyšić`,
    limit: "Tutón swět docpěje bórze maksimalnu kapacitu!",
    accessDenied: {
        camera: "Přistup ke kamerje zapowěł. Tu kliknješ, zo bychu so twoje browser woprawnjenja pruwowałi. ",
        screenSharing:
            "Přistup k dowolnosći wobrazowki zapowěł. Tu kliknješ, zo bychu so twoje browser woprawnjenja pruwowałi. ",
        room: "Přistup njedowoleny. Tebi faluje woprawnje, zo do tuteho ruma zastupiš. ",
        teleport: "Woni njesmědźa so k tutemu wužiwarjej přisamjenić.",
    },
    importantMessage: "wažna powěsć",
    connectionLost: "Zwiski přetorhnjene. Zaso zwjazować.. ",
    connectionLostTitle: "zwiski přetorhnjene",
    connectionLostSubtitle: "zaso zwjazować",
    waitingConnectionTitle: "na zwisk čakać",
    waitingConnectionSubtitle: "zwjazać",
    megaphoneNeeds:
        "Zo by megafon wužiwał, dyrbiš swoju kameru abo swój mikrofon aktiwować abo swoju wobrazowku dźělić.",
    mapEditorShortCut: "Při pospyšanju editora kartow wočinić je zmylk wustupił.",
    mapEditorNotEnabled: "Editor kartow njeje na tutym swěće zmóžnjeny.",
    backgroundProcessing: {
        failedToApply: "Nałoženje pozadkowych efektow je so njeporadźiło",
    },
    popupBlocked: {
        title: "Blokěrowanje wuskakowaceho wokna",
        content: "Prošu w browseru wuskakowace wokna za tutu stronu dowolić.",
        done: "Ok",
    },
    browserNotSupported: {
        title: "😢 Wobhladowak so njepodpěruje",
        message: "Waš wobhladowak ({browserName}) so wjace njepodpěruje wot WorkAdventure.",
        description:
            "Waš wobhladowak je přestarši, zo by WorkAdventure wuwjedł. Prošu aktualizujće jón na najnowšu wersiju, zo byšće pokročowali.",
        whatToDo: "Što móžeće činić?",
        option1: "{browserName} na najnowšu wersiju aktualizować",
        option2: "WorkAdventure wopušćić a druhi wobhladowak wužiwać",
        updateBrowser: "Wobhladowak aktualizować",
        leave: "Wopušćić",
    },
    pwaInstall: {
        title: "WorkAdventure instalować",
        description:
            "Aplikaciju instalować za lěpše dožiwjenje: spěšnije začitanje, spěšny přistup a dožiwjenje kaž aplikacija.",
        descriptionIos: "WorkAdventure k startowemu wobrazowej přidać za lěpše dožiwjenje a spěšny přistup.",
        iosStepsTitle: "Kak instalować",
        iosStep1: "Tłóč na tłóčatko „Dźělić“ (kwadrat ze šipku) deleka w Safari.",
        iosStep2: "Skuluj deleka a tłóč na „K startowemu wobrazowej přidać“.",
        iosStep3: "Tłóč na „Přidać“, zo by wobkrućił.",
        install: "WorkAdventure Web-App instalować",
        installing: "Instaluje so…",
        skip: "W wobhladowaku pokročować",
        continue: "W wobhladowaku pokročować",
        neverShowPage: "Tutu stronu hižo njepokazać",
    },
};

export default warning;
