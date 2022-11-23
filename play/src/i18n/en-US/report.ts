import type { BaseTranslation } from "../i18n-types";

const report: BaseTranslation = {
    block: {
        title: "Block",
        content: "Block any communication from and to {userName}. This can be reverted.",
        unblock: "Unblock this user",
        block: "Block this user",
    },
    title: "Report",
    content: "Send a report message to the administrators of this room. They may later ban this user.",
    message: {
        title: "Your message: ",
        empty: "Report message cannot to be empty.",
        error: "Report message error, you can contact the administrator.",
    },
    submit: "Report this user",
    moderate: {
        title: "Moderate {userName}",
        block: "Block",
        report: "Report",
        noSelect: "ERROR : There is no action selected.",
    },
};

export default report;
