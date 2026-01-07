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
};

export default warning;
