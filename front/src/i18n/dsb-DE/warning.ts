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
    popupBlocked: {
        title: "Pop-up-bloker",
        content: "Zwól pop-upy za ten webbok we nastajenjach browsera.",
        done: "Ok",
    },
};

export default warning;
