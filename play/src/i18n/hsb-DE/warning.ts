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
};

export default warning;
