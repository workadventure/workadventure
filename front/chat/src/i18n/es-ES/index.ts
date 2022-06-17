import en_US from "../en-US";
import type { Translation } from "../i18n-types";
import chat from "../ca-ES/chat";

const es_ES: Translation = {
    ...(en_US as Translation),
    chat
};

export default es_ES;
