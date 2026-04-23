import type { BaseTranslation } from "../i18n-types";

const recording: BaseTranslation = {
    refresh: "Refresh",
    title: "Your recording list",
    noRecordings: "No recordings found",
    errorFetchingRecordings: "An error occurred while fetching recordings",
    expireIn: "Expires in {days} day{s}",
    expiresOn: "Expires on {date}",
    download: "Download",
    close: "Close",
    recordingList: "Recordings",
    viewList: "List view",
    viewCards: "Card view",
    back: "Back",
    actions: "Actions",
    contextMenu: {
        openInNewTab: "Open in new tab",
        delete: "Delete",
    },
    notification: {
        deleteNotification: "Recording deleted successfully",
        deleteFailedNotification: "Failed to delete recording",
        startFailedNotification: "Failed to start recording",
        stopFailedNotification: "Failed to stop recording",
        recordingStarted: "{name} has started a recording.",
        downloadFailedNotification: "Failed to download recording",
        recordingComplete: "Recording complete",
        recordingIsInProgress: "Recording is in progress",
        recordingSaved: "Your recording has been saved successfully.",
        howToAccess: "To access your recordings:",
        viewRecordings: "View Recordings",
    },
    actionbar: {
        title: {
            start: "Start recording",
            stop: "Stop recording",
            inProgress: "A recording is in progress",
        },
        desc: {
            needLogin: "You need to be logged to record.",
            needPremium: "You need to be premium to record.",
            advert: "All participants will be notified that you are starting a recording.",
            yourRecordInProgress: "Recording in progress, click to stop it.",
            inProgress: "A recording is in progress",
            notEnabled: " Recordings are disabled for this world.",
        },
        spacePicker: {
            megaphone: "Record megaphone",
            discussion: "Record discussion",
        },
        layoutPicker: {
            title: "Recording layout",
            subtitle: "Choose how the recording will frame participants.",
            gridLabel: "Grid",
            gridDesc: "Mosaic view with all participants.",
            speakerLabel: "Speaker & screen share",
            speakerDesc: "Large view for the latest screen share or the active speaker; others in a side column.",
            confirm: "Start recording",
            cancel: "Cancel",
        },
    },
};

export default recording;
