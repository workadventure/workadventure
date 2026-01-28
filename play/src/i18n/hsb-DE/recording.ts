import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Aktualizować",
    title: "Waša lisćina nagraćow",
    noRecordings: "Žane nagraća namakane",
    errorFetchingRecordings: "Zmylk je nastał při wotwołowanju nagraćow",
    expireIn: "Spadnje za {days} dźeń{s}",
    download: "Sćahnyć",
    close: "Začinić",
    ok: "W porjadku",
    recordingList: "Nagraća",
    contextMenu: {
        openInNewTab: "W nowym rajtarku wočinić",
        delete: "Zhašeć",
    },
    notification: {
        deleteNotification: "Nagraće wuspěšnje zhašene",
        deleteFailedNotification: "Zhašowanje nagraća njeje so poradźiło",
        recordingStarted: "Jedyn wotdźělnik w diskusiji je nagraće započał.",
        downloadFailedNotification: "Sćehnjenje nagraća njeje so poradźiło",
    },
    actionbar: {
        title: {
            start: "Nagraće započeć",
            stop: "Nagraće zastajić",
            inProgress: "Nagraće běži",
        },
        desc: {
            needLogin: "Dyrbiće přizjewjeny być, zo by nagrał.",
            needPremium: "Dyrbiće premium być, zo by nagrał.",
            advert: "Wšitcy wobdźělnicy dostanu powěsć, zo započinajaće nagraće.",
            yourRecordInProgress: "Nagraće běži, klikńće, zo by jo zastajił.",
            inProgress: "Nagraće běži",
            notEnabled: "Nagraća su za tutón swět znjemóžnjene.",
        },
    },
};

export default recording;
