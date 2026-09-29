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
        action: "Moderate",
        block: "Block",
        report: "Report",
        noSelect: "ERROR : There is no action selected.",
        reason: {
            label: "Reason",
            placeholder: "Optional. {userName} will see this message.",
        },
        adminOnly: "Reserved to admins",
        cancel: "Cancel",
        hint: {
            block: "Stop seeing and hearing them. Only for you, and reversible.",
            report: "Alert the administrators.",
            kick: "Disconnect them now. They may come back.",
            ban: "Disconnect them for good.",
        },
        kick: {
            title: "Kick",
            content: "{userName} is disconnected right away, and may come back later.",
            submit: "Kick",
            confirmTitle: "Kick {userName}",
        },
        ban: {
            title: "Ban from the world",
            content:
                "{userName} is disconnected and will not be able to join this world again, even with another account.",
            submit: "Ban",
            confirmTitle: "Ban {userName} for good?",
            confirmContent:
                "This cannot be undone from the game. Only an administrator can lift the ban from the back office.",
        },
    },
    kicked: {
        title: "KICKED",
        subtitle: "A moderator kicked you from this map",
    },
    banned: {
        title: "BANNED",
        subtitle: "You were banned from WorkAdventure",
        details: "If you want more information, you may contact us at: hello@workadventu.re",
    },
    reasonGiven: "Reason: {reason}",
};

export default report;
