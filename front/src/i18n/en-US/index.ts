import type { BaseTranslation } from "../i18n-types";
import audio from "./audio";
import camera from "./camera";
import chat from "./chat";
import companion from "./companion";
import woka from "./woka";
import error from "./error";
import follow from "./follow";
import login from "./login";
import menu from "./menu";
import report from "./report";
import warning from "./warning";
import emoji from "./emoji";

const en_US: BaseTranslation = {
    language: "English",
    country: "United States",
    audio,
    camera,
    chat,
    companion,
    woka,
    error,
    follow,
    login,
    menu,
    report,
    warning,
    emoji,
};

export default en_US;
