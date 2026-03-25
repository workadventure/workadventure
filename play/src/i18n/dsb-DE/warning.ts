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
    livekitConnection: {
        critical: "You might encounter communication problems with other users.",
        warning: "Your audio or video quality might be reduced.",
    },
    popupBlocked: {
        title: "Pop-up-bloker",
        content: "Zwól pop-upy za ten webbok we nastajenjach browsera.",
        done: "Ok",
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
};

export default warning;
