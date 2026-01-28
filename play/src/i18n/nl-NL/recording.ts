import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Vernieuwen",
    title: "Uw opnamelijst",
    noRecordings: "Geen opnames gevonden",
    errorFetchingRecordings: "Er is een fout opgetreden bij het ophalen van opnames",
    expireIn: "Verloopt over {days} dag{s}",
    download: "Downloaden",
    close: "Sluiten",
    ok: "Ok",
    recordingList: "Opnames",
    contextMenu: {
        openInNewTab: "Openen in nieuw tabblad",
        delete: "Verwijderen",
    },
    notification: {
        deleteNotification: "Opname succesvol verwijderd",
        deleteFailedNotification: "Verwijderen van opname mislukt",
        recordingStarted: "Een persoon in de discussie heeft een opname gestart.",
        downloadFailedNotification: "Downloaden van opname mislukt",
        recordingComplete: "Opname voltooid",
        recordingIsInProgress: "Opname is bezig",
        recordingSaved: "Uw opname is succesvol opgeslagen.",
        howToAccess: "Om toegang te krijgen tot uw opnames:",
        viewRecordings: "Opnames bekijken",
    },
    actionbar: {
        title: {
            start: "Opname starten",
            stop: "Opname stoppen",
            inpProgress: "Een opname is bezig",
        },
        desc: {
            needLogin: "U moet ingelogd zijn om op te nemen.",
            needPremium: "U moet premium zijn om op te nemen.",
            advert: "Alle deelnemers worden op de hoogte gesteld dat u een opname start.",
            yourRecordInProgress: "Opname bezig, klik om te stoppen.",
            inProgress: "Een opname is bezig",
            notEnabled: "Opnames zijn uitgeschakeld voor deze wereld.",
        },
    },
};

export default recording;
