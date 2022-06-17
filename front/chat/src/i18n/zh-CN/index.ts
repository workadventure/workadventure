import en_US from "../en-US";
import type { Translation } from "../i18n-types";
import chat from "./chat";

const zh_CN: Translation = {
    ...(en_US as Translation),
    chat
};

export default zh_CN;
