import en_US from "../en-US";
import type { Translation } from "../i18n-types";
import audio from "./audio";
import camera from "./camera";
import chat from "./chat";
import companion from "./companion";
import emoji from "./emoji";
import error from "./error";
import follow from "./follow";
import login from "./login";
import menu from "./menu";
import report from "./report";
import warning from "./warning";
import woka from "./woka";
import trigger from "./trigger";

const fr_FR: Translation = {
    ...(en_US as Translation),
    language: "Français",
    country: "France",
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
    trigger,
};

export default fr_FR;
