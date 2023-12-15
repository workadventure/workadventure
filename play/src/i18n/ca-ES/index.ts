import merge from "ts-deepmerge";
import en_US from "../en-US";
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
import trigger from "./trigger";
import muc from "./muc";
import notification from "./notification";
import cowebsite from "./cowebsite";
import actionbar from "./actionbar";
import video from "./video";

const ca_ES = merge(en_US, {
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
    muc,
    notification,
    cowebsite,
    actionbar,
    video,
});

export default ca_ES;
