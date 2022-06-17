import en_US from "../en-US";
import type { Translation } from "../i18n-types";
import chat from "./chat";

const de_DE: Translation = {
    ...(en_US as Translation),
    chat
};

export default de_DE;
