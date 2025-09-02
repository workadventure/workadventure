import merge from "ts-deepmerge";
import en_US from "../en-US";
import audio from "./audio";
import camera from "./camera";
import chat from "./chat";
import companion from "./companion";
import error from "./error";
import follow from "./follow";
import login from "./login";
import menu from "./menu";
import report from "./report";
import warning from "./warning";
import woka from "./woka";
import trigger from "./trigger";
import notification from "./notification";
import cowebsite from "./cowebsite";
import actionbar from "./actionbar";
import mapEditor from "./mapEditor";
import megaphone from "./megaphone";
import video from "./video";
import say from "./say";
import statusModal from "./statusModal";
import area from "./area";
import externalModule from "./externalModule";
import form from "./form";
import refreshPrompt from "./refreshPrompt";

const fr_FR = merge(en_US, {
    area,
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
    cowebsite,
    actionbar,
    mapEditor,
    megaphone,
    video,
    say,
    statusModal,
    externalModule,
    form,
    refreshPrompt,
});

export default fr_FR;
