import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Aktualisieren",
    title: "Ihre Aufnahmeliste",
    noRecordings: "Keine Aufnahmen gefunden",
    errorFetchingRecordings: "Fehler beim Abrufen der Aufnahmen",
    expireIn: "Läuft ab in {days} Tag{s}",
    download: "Herunterladen",
    close: "Schließen",
    ok: "Ok",
    recordingList: "Aufnahmen",
    contextMenu: {
        openInNewTab: "In neuem Tab öffnen",
        delete: "Löschen",
    },
    notification: {
        deleteNotification: "Aufnahme erfolgreich gelöscht",
        deleteFailedNotification: "Löschen der Aufnahme fehlgeschlagen",
        recordingStarted: "Eine Person in der Diskussion hat eine Aufnahme gestartet.",
        downloadFailedNotification: "Herunterladen der Aufnahme fehlgeschlagen",
        recordingComplete: "Aufnahme abgeschlossen",
        recordingIsInProgress: "Aufnahme läuft",
        recordingSaved: "Ihre Aufnahme wurde erfolgreich gespeichert.",
        howToAccess: "So greifen Sie auf Ihre Aufnahmen zu:",
        viewRecordings: "Aufnahmen anzeigen",
    },
    actionbar: {
        title: {
            start: "Aufnahme starten",
            stop: "Aufnahme stoppen",
            inpProgress: "Eine Aufnahme läuft",
        },
        desc: {
            needLogin: "Sie müssen angemeldet sein, um aufzunehmen.",
            needPremium: "Sie müssen Premium sein, um aufzunehmen.",
            advert: "Alle Teilnehmer werden benachrichtigt, dass Sie eine Aufnahme starten.",
            yourRecordInProgress: "Aufnahme läuft, klicken Sie, um sie zu stoppen.",
            inProgress: "Eine Aufnahme läuft",
            notEnabled: "Aufnahmen sind für diese Welt deaktiviert.",
        },
    },
};

export default recording;
