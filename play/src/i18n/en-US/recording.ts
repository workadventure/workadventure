import type { BaseTranslation } from "../i18n-types";

const recording: BaseTranslation = {
    refresh: "Refresh",
    title: "Your recording list",
    noRecordings: "No recordings found",
    expireIn: "Expires in {days} day{s}",
    download: "Download",
    close: "Close",
    ok: "Ok",
    recordingList: "Recordings",
    contextMenu: {
        openInNewTab: "Open in new tab",
        copyLink: "Copy link",
        delete: "Delete",
    },
    notification: {
        deleteNotification: "Recording deleted successfully",
        deleteFailedNotification: "Failed to delete recording",
        recordingStarted: "One person in the discussion has started a recording.",
    },
    actionbar: {
        help: {
            desc: {
                start: "Start recording",
                stop: "Stop recording",
                inProgress: "A recording is in progress",
            },
        },
    },
};

export default recording;
