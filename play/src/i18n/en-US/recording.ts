import type { BaseTranslation } from "../i18n-types";

const recording: BaseTranslation = {
    refresh: "Refresh",
    title: "Your recording list",
    noRecordings: "No recordings found",
    errorFetchingRecordings: "An error occurred while fetching recordings",
    expireIn: "Expires in {days} day{s}",
    download: "Download",
    close: "Close",
    ok: "Ok",
    recordingList: "Recordings",
    contextMenu: {
        openInNewTab: "Open in new tab",
        delete: "Delete",
    },
    notification: {
        deleteNotification: "Recording deleted successfully",
        deleteFailedNotification: "Failed to delete recording",
        recordingStarted: "One person in the discussion has started a recording.",
        downloadFailedNotification: "Failed to download recording",
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
    },
};

export default recording;
