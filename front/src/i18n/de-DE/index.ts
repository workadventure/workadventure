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

const de_DE: Translation = {
    ...en_US,
    language: "Deutsch",
    country: "Deutschland",
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

export default de_DE;
