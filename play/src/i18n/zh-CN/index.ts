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
import trigger from "./trigger";
import notification from "./notification";
import actionbar from "./actionbar";
import video from "./video";
import form from "./form";
import say from "./say";

const zh_CN = merge(en_US, {
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
    trigger,
    notification,
    actionbar,
    video,
    form,
    say,
});

export default zh_CN;
