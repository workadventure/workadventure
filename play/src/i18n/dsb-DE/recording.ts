import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Aktualizěrowaś",
    title: "Waša lisćina nagraśow",
    noRecordings: "Žedne nagraśa namakane",
    errorFetchingRecordings: "Zmólka jo nastała pśi wótwołowanju nagraśow",
    expireIn: "Spadnjo za {days} źeń{s}",
    expiresOn: "Spadnjo {date}",
    download: "Ześěgnuś",
    close: "Zacyniś",
    recordingList: "Nagraśa",
    viewList: "Lisćinowy naglěd",
    viewCards: "Kartowy naglěd",
    back: "Slědk",
    actions: "Akcije",
    contextMenu: {
        openInNewTab: "W nowem rejtariku wócyniś",
        delete: "Lašowaś",
    },
    notification: {
        deleteNotification: "Nagraśe wuspěšnje wulašowane",
        deleteFailedNotification: "Wulašowanje nagraśa njejo se raźiło",
        startFailedNotification: "Startovanje nagraśa njejo se raźiło",
        stopFailedNotification: "Zastajenje nagraśa njejo se raźiło",
        recordingStarted: "{name} jo nagraśe zachopił.",
        downloadFailedNotification: "Ześěgnjenje nagraśa njejo se raźiło",
        recordingComplete: "Nagraśe dokóncone",
        recordingIsInProgress: "Nagraśe běžy",
        recordingSaved: "Wašo nagraśe jo se wuspěšnje składowało.",
        howToAccess: "Aby pśistup k wašym nagraśam:",
        viewRecordings: "Nagraśa pokazaś",
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
        spacePicker: {
            megaphone: "Megafon nagraś",
            discussion: "Diskusiju nagraś",
        },
        layoutPicker: {
            title: "Recording layout",
            subtitle: "Choose how the recording will frame participants.",
            gridLabel: "Grid",
            gridDesc: "Mosaic view with all participants.",
            speakerLabel: "Speaker & screen share",
            speakerDesc: "Large view for the latest screen share or the active speaker; others in a side column.",
            fullscreenLabel: "Fullscreen (LiveKit)",
            fullscreenDesc:
                "One participant at a time using LiveKit VideoTrack (same idea as the official single-speaker layout).",
            confirm: "Start recording",
            cancel: "Cancel",
        },
    },
};

export default recording;
