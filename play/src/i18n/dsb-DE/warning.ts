import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "Warnowanje!",
    content: `Ten swět dosegnjo skóro swóju maksimalnu kapacitu. Ty móžoš kapacitu <a href="{upgradeLink}" target="_blank">howko</a> pówušyś`,
    limit: "Ten swět dosegnjo skóro swóju maksimalnu kapacitu!",
    accessDenied: {
        camera: "Pśistup ku kamerje njejo zwólony. Klikni how, aby  nastajenja browsera kontrolěrował.",
        screenSharing: "Pśenosowanje wobrazowki njejo zwólone. Klikni how, aby nastajenja browsera kontrolěrował.",
        room: "Pśistup zakazany. Njamaš pšawa, aby stupił do teje śpy.",
        teleport: "Wy njesmějośo se teleportěrowaś k tomu wužywarjeju.",
    },
    importantMessage: "Wažna powěsć",
    connectionLost: "Zwězanje jo pśetergnjone. Zwězanje naspjet startowaś...",
    connectionLostTitle: "Zwězanja su pśetergnjone",
    connectionLostSubtitle: "Zwězanje naspjet startowaś...",
    waitingConnectionTitle: "Na zwězanje cakaś",
    waitingConnectionSubtitle: "Zwězaś",
    megaphoneNeeds: "Aby megafon wužywał, musyš swóju kameru abo swój mikrofon aktiwěrowaś abo swóju wobrazowku źěliś.",
    mapEditorShortCut: "Pśi wopyśe editora kórtow wócyniś jo zmólka nastała.",
    mapEditorNotEnabled: "Editor kórtow njejo na toś tom swěśe zmóžnjony.",
    backgroundProcessing: {
        failedToApply: "Zastosowanje pozadkowych efektow jo se njeraźiło",
    },
    popupBlocked: {
        title: "Pop-up-bloker",
        content: "Zwól pop-upy za ten webbok we nastajenjach browsera.",
        done: "Ok",
    },
    duplicateUserConnected: {
        title: "Južo zwězany",
        message:
            "Toś ten wužywaŕ jo južo z drugego rejtarika abo rěda zwězany z toś tym rumom. Pšosym zawrijśo drugi rejtarik abo wokno, aby konflikty wobešł.",
        confirmContinue: "Rozměju, pókšacowaś",
        dontRemindAgain: "Toś tu powěsć wěcej njepokazaś",
    },
    browserNotSupported: {
        title: "😢 Wobglědowak se njepódpěra",
        message: "Waš wobglědowak ({browserName}) se wěcej njepódpěra wót WorkAdventure.",
        description:
            "Waš wobglědowak jo pśestaršy, aby WorkAdventure wuwjadł. Pšosym aktualizěrujśo jogo na nejnowšu wersiju, aby pókšacowali.",
        whatToDo: "Co móžośo cyniś?",
        option1: "{browserName} na nejnowšu wersiju aktualizěrowaś",
        option2: "WorkAdventure wopušćiś a drugi wobglědowak wužywaś",
        updateBrowser: "Wobglědowak aktualizěrowaś",
        leave: "Wopušćiś",
    },
    pwaInstall: {
        title: "WorkAdventure instalěrowaś",
        description:
            "Instalěrujśo app za lěpše dožywjenje: malsny pśistup, start pśi zachopjenju a dožywjenje ako w app.",
        descriptionIos: "Pśidajśo WorkAdventure k startowemu wobrazoju za lěpše dožywjenje a malsny pśistup.",
        feature1Title: "Malsny pśistup",
        feature1Description: "Startujśo WorkAdventure ze startowego menija, Docka abo z desktopa.",
        feature2Title: "Swójske wokno app",
        feature2Description:
            "Źaržćo WorkAdventure wótkźělone wót rejtarikow wobglědowaka a namakajśo jo malsnje w swójej nadawkowej rědce.",
        feature3Title: "Ze swójim kompjutarom startowaś",
        feature3Description: "Startujśo WorkAdventure, gaž se waš rěd zachopijo.",
        iosStepsTitle: "Kak instalěrowaś",
        iosStep1: "Pótusniśo tłocašk „Źěliś“ (kwadrat z šypku) dołojce w Safari.",
        iosStep2: "Skulěrujśo dołojce a pótusniśo „K startowemu wobrazoju pśidaś“.",
        iosStep3: "Pótusniśo „Pśidaś“, aby wobkšuśił.",
        install: "WorkAdventure-app instalěrowaś",
        installing: "Instalěrujo se…",
        skip: "W wobglědowaku pókšacowaś",
        continue: "W wobglědowaku pókšacowaś",
        neverShowPage: "Wěcej se njepšašaś",
    },
};

export default warning;
