import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Aktualizěrowaś",
    title: "Waša lisćina nagraśow",
    noRecordings: "Žedne nagraśa namakane",
    errorFetchingRecordings: "Zmólka jo nastała pśi wótwołowanju nagraśow",
    expireIn: "Spadnjo za {days} źeń{s}",
    download: "Ześěgnuś",
    close: "Zacyniś",
    ok: "W pórěźe",
    recordingList: "Nagraśa",
    contextMenu: {
        openInNewTab: "W nowem rejtariku wócyniś",
        delete: "Lašowaś",
    },
    notification: {
        deleteNotification: "Nagraśe wuspěšnje wulašowane",
        deleteFailedNotification: "Wulašowanje nagraśa njejo se raźiło",
        recordingStarted: "Jaden wótźělnik w diskusiji jo nagraśe zachopił.",
        downloadFailedNotification: "Ześěgnjenje nagraśa njejo se raźiło",
    },
    actionbar: {
        title: {
            start: "Nagraśe zachopiś",
            stop: "Nagraśe zastajiś",
            inProgress: "Nagraśe běžy",
        },
        desc: {
            needLogin: "Musyśo pśizjawjony byś, aby nagrał.",
            needPremium: "Musyśo premium byś, aby nagrał.",
            advert: "Wšykne wobźělniki dostanu powěźeńku, až zachopijośo nagraśe.",
            yourRecordInProgress: "Nagraśe běžy, klikniśo, aby jo zastajił.",
            inProgress: "Nagraśe běžy",
            notEnabled: "Nagraśa su za toś ten swět znjemóžnjone.",
        },
    },
};

export default recording;
