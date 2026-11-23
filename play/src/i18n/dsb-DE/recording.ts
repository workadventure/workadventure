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
        unexpectedlyStoppedNotification: "Nagraśe jo se njewócakowanje zastajiło",
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
            advert: "Wšykne wobźělniki dostanu powěźeńku, až zachopijośo nagraśe.",
            yourRecordInProgress: "Nagraśe běžy, klikniśo, aby jo zastajił.",
            inProgress: "Nagraśe běžy",
        },
        spacePicker: {
            title: "Nagraś",
            source: "Co nagraś",
            savedHint: "Pśi skóńcenju se we wašych nagraśach składujo.",
            megaphone: "Megafon nagraś",
            discussion: "Diskusiju nagraś",
            withMap: "Wugótowanje wideja:",
            camerasOnly: "Jano kamery",
            camerasOnlyHint:
                "Jano kamery, bźez kórty. Toś to wideo njedajo se pśi nagrawanju wóźiś: žeden pólo producenta, žedne změny wugótowanja abo zooma.",
            layout: {
                map: "Nejpjerwjej kórta",
                balanced: "Wurownane",
                cameras: "Nejpjerwjej kamery",
            },
        },
        producer: {
            preview: "Něnto we wideju",
            layout: "Wugótowanje",
            zoom: "Zoom",
            zoomLevel: {
                tight: "Blisko",
                wide: "Pómjeńšone",
                whole: "Ceła kórta",
            },
            framing: "Wurězk",
            follow: "Bublinje slědowaś",
            frameMyView: "Pokazaś, což wiźim",
            cameras: "Kamery",
            pin: "Pśipěś",
            unpin: "Wótpěś",
            pinHint: "Pśipěta wósoba wobdźaržy swóju kachlicu, teke gaž mjelcy (až do {max}).",
        },
    },
};

export default recording;
