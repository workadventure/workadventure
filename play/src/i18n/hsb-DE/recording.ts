import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Aktualizować",
    title: "Waša lisćina nagraćow",
    noRecordings: "Žane nagraća namakane",
    errorFetchingRecordings: "Zmylk je nastał při wotwołowanju nagraćow",
    expireIn: "Spadnje za {days} dźeń{s}",
    expiresOn: "Spadnje {date}",
    download: "Sćahnyć",
    close: "Začinić",
    recordingList: "Nagraća",
    viewList: "Lisćinowy napohlad",
    viewCards: "Kartowy napohlad",
    back: "Sydom",
    actions: "Akcije",
    contextMenu: {
        openInNewTab: "W nowym rajtarku wočinić",
        delete: "Zhašeć",
    },
    notification: {
        deleteNotification: "Nagraće wuspěšnje zhašene",
        deleteFailedNotification: "Zhašowanje nagraća njeje so poradźiło",
        startFailedNotification: "Startowanje nagraća njeje so poradźiło",
        stopFailedNotification: "Zastajenje nagraća njeje so poradźiło",
        recordingStarted: "{name} je nagraće započał.",
        downloadFailedNotification: "Sćehnjenje nagraća njeje so poradźiło",
        recordingComplete: "Nagraće dokónčene",
        recordingIsInProgress: "Nagraće běži",
        unexpectedlyStoppedNotification: "Nagraće je so njewočakowanje zastajiło",
        recordingSaved: "Waše nagraće je so wuspěšnje składowało.",
        howToAccess: "Zo byšće na waše nagraća přistupował:",
        viewRecordings: "Nagraća pokazać",
    },
    actionbar: {
        title: {
            start: "Nagraće započeć",
            stop: "Nagraće zastajić",
            inProgress: "Nagraće běži",
        },
        desc: {
            needLogin: "Dyrbiće přizjewjeny być, zo by nagrał.",
            advert: "Wšitcy wobdźělnicy dostanu powěsć, zo započinajaće nagraće.",
            yourRecordInProgress: "Nagraće běži, klikńće, zo by jo zastajił.",
            inProgress: "Nagraće běži",
        },
        spacePicker: {
            title: "Nahrać",
            source: "Što nahrać",
            savedHint: "Při skónčenju so we wašich nahrawkach składuje.",
            megaphone: "Megafon nagrać",
            discussion: "Diskusiju nagrać",
            withMap: "Wuhotowanje wideja:",
            camerasOnly: "Jenož kamery",
            camerasOnlyHint:
                "Jenož kamery, bjez karty. Tute widejo njeda so při nahrawanju wodźić: žadyn panel producenta, žane změny wuhotowanja abo zooma.",
            layout: {
                map: "Najprjedy karta",
                balanced: "Wurunane",
                cameras: "Najprjedy kamery",
            },
        },
        producer: {
            preview: "Nětko we widejo",
            layout: "Wuhotowanje",
            zoom: "Zoom",
            zoomLevel: {
                tight: "Blisko",
                wide: "Pomjeńšene",
                whole: "Cyła karta",
            },
            framing: "Wurězk",
            follow: "Bublinje sćěhować",
            frameMyView: "Pokazać, štož widźu",
            cameras: "Kamery",
            pin: "Připjeć",
            unpin: "Wotpjeć",
            pinHint: "Připjata wosoba wobchowa swoju kachlicu, tež hdyž mjelči (hač do {max}).",
        },
    },
};

export default recording;
