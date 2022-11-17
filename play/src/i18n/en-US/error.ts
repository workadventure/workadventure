import type { BaseTranslation } from "../i18n-types";

const error: BaseTranslation = {
    accessLink: {
        title: "Access link incorrect",
        subTitle: "Could not find map. Please check your access link.",
        details: "If you want more information, you may contact administrator or contact us at: hello@workadventu.re",
    },
    connectionRejected: {
        title: "Connection rejected",
        subTitle: "You cannot join the World. Try again later {error}.",
        details: "If you want more information, you may contact administrator or contact us at: hello@workadventu.re",
    },
    connectionRetry: {
        unableConnect: "Unable to connect to WorkAdventure. Are you connected to internet?",
    },
    error: "Error",
};

export default error;
